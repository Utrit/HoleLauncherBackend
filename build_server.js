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
    return target
}

async function DownloadFile(url, target) {
    const res = await fetch(url, {method: 'GET', headers: headers})
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.toString('utf8', 0, 12) == 'FileNotFound') {
        throw new Error('FileNotFound')
    }
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, buf)
}

async function HandleMod(entry, manifest, stats) {
    while(stats.loading>5){
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    stats.loading++;
    if (entry.ModServerSide == 'unsupported' || entry.ModType == 2) {
        console.log(`[SKIP] ${entry.ModName} - unsupported on server`)
        stats.skipped++
        stats.loading--;
        return
    }

    const url = HandleBackendLink(entry, manifest)
    const target = ResolveTargetPath(entry)

    if (fs.existsSync(target) && await utils.GetFileSHA(target) == entry.ModSHA512) {
        console.log(`[OK] ${entry.ModName} - up to date`)
        stats.cached++
        stats.loading--;
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
        stats.loading--;
        return
    }
    stats.downloaded++
    stats.loading--;
}

async function BuildServer() {
    const manifest = utils.ReadJson(manifestPath)
    if (manifest.InstanceId == null) {
        console.log(`fail ${manifestPath} is not an instance manifest`)
        process.exitCode = 1
        return
    }
    console.log(`[BUILD] ${manifest.InstanceName} (${manifest.InstanceId}) -> ${outputDir}`)

    const stats = { downloaded: 0, cached: 0, skipped: 0, failed: 0, hashMismatch: 0, loading:0, toload:[] }

    manifest.Mods.forEach(element => {
        stats.toload.push(HandleMod(element, manifest, stats))
    });

    await Promise.all(stats.toload)

    console.log(`[BUILD] FINISH downloaded:${stats.downloaded} cached:${stats.cached} skipped:${stats.skipped} failed:${stats.failed} hashMismatch:${stats.hashMismatch}`)
    if (stats.failed > 0 || stats.hashMismatch > 0) process.exitCode = 1
}

BuildServer();
