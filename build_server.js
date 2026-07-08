const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const fetch = require('node-fetch').default;
const utils = require('./build_utils.js')

const backendAddress = process.env.BACKEND_ADDRESS || 'localhost:45565'
const backendPrefix = '[BACKEND]:.'
const headers = {"user-agent": "utrit/holelauncher/1.0"}

const manifestPath = path.resolve(process.argv[2] || './manifest.json')
const outputDir = path.resolve(process.argv[3] || './server')

function HandleBackendLink(entry, manifest) {
    if (!entry.ModLink.startsWith(backendPrefix)) return entry.ModLink
    const removed = entry.ModLink.slice(backendPrefix.length)
    const url = new URL(`http://${backendAddress}/loadcontent`)
    url.searchParams.set('id', manifest.InstanceId)
    url.searchParams.set('filePath', `.${removed}`)
    return url.toString()
}

function ResolveTargetPath(entry) {
    const relative = entry.ModPath.replace(/^\.?\//, '')
    const target = path.resolve(outputDir, relative, entry.ModName)
    if (!target.startsWith(outputDir + path.sep)) {
        throw new Error(`abuse ModPath? ${entry.ModPath}`)
    }
    return target
}

async function DownloadFile(url, target) {
    const res = await fetch(url, {method: 'GET', headers: headers})
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    // the backend replies "FileNotFound" with status 200
    if (buf.toString('utf8', 0, 12) == 'FileNotFound') {
        throw new Error('FileNotFound')
    }
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, buf)
}

async function HandleMod(entry, manifest, stats) {
    if (entry.ModServerSide == 'unsupported') {
        console.log(`[SKIP] ${entry.ModName} - unsupported on server`)
        stats.skipped++
        return
    }

    const url = HandleBackendLink(entry, manifest)
    const target = ResolveTargetPath(entry)

    if (fs.existsSync(target) && await utils.GetFileSHA(target) == entry.ModSHA512) {
        console.log(`[OK] ${entry.ModName} - up to date`)
        stats.cached++
        return
    }

    console.log(`[GET] ${entry.ModName}`)
    await DownloadFile(url, target)

    const sha = await utils.GetFileSHA(target)
    if (entry.ModSHA512 && sha != entry.ModSHA512) {
        console.log(`[HASH] ${entry.ModName} - SHA512 mismatch`)
        console.log(`       expected: ${entry.ModSHA512}`)
        console.log(`       actual:   ${sha}`)
        stats.hashMismatch++
        return
    }
    stats.downloaded++
}

async function BuildServer() {
    const manifest = utils.ReadJson(manifestPath)
    if (manifest.InstanceId == null) {
        console.log(`fail ${manifestPath} is not an instance manifest`)
        process.exitCode = 1
        return
    }
    console.log(`[BUILD] ${manifest.InstanceName} (${manifest.InstanceId}) -> ${outputDir}`)

    const stats = { downloaded: 0, cached: 0, skipped: 0, failed: 0, hashMismatch: 0 }

    for (const entry of manifest.Mods) {
        try {
            await HandleMod(entry, manifest, stats)
        } catch (err) {
            console.log(`[FAIL] ${entry.ModName} - ${err.message}`)
            stats.failed++
        }
    }

    console.log(`[BUILD] FINISH downloaded:${stats.downloaded} cached:${stats.cached} skipped:${stats.skipped} failed:${stats.failed} hashMismatch:${stats.hashMismatch}`)
    if (stats.failed > 0 || stats.hashMismatch > 0) process.exitCode = 1
}

BuildServer();
