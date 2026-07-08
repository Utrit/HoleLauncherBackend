const fs = require('fs/promises');
const fetch = require('node-fetch').default;
const utils = require('./build_utils.js')

const folderPath = './instances';
const modrinthApi = "https://api.modrinth.com/v2"
const projectsUrl = new URL(`${modrinthApi}/projects`)
const headers = {'content-type': 'application/json', "user-agent": "utrit/holelauncher/1.0"}
let loading = 0

async function HandleInstances(directoryPath) {
  try {
    const files = utils.GetFilesInDirectory(directoryPath)
    for (const file of files) {
      HandleInstance(`${directoryPath}/${file}`)
    }
  } catch (err) {
    console.error(err);
  }
}

const ToDelete = ["info.json", "modrinth.json", "manifest.json"]

async function HandleInstance(dir){
    const instanceName = dir.split("/").pop()
    let files = utils.GetFilesInDirectory(dir)
    const info = utils.ReadJson(`${dir}/info.json`)
    if (info.InstanceId == null) return
    const modrinth = utils.ReadJson(`${dir}/modrinth.json`)
    const instanceManifest = utils.ReadJson(`${dir}/manifest.json`)
    files = files.filter(item => !ToDelete.includes(item))
    const modList = []
    modList.push(HandleModList(modrinth.strong, info, 0))
    modList.push(HandleModList(modrinth.soft, info, 1))
    modList.push(HandleModList(modrinth.optional, info, 2))
    const res = (await Promise.all(modList)).flat().filter(x=>x!=undefined)

    const localFiles = (await PackLocalFiles(dir, files)).flat()
    const localShareFiles = await GetFilesSHA(localFiles)
    AddLocalFiles(localShareFiles, info, res, dir)

    const manifest = {
      InstanceId: instanceName,
      InstanceName: info.InstanceName,
      InstanceMCVersion: info.InstanceMCVersion,
      InstanceForgeVersion: info.InstanceForgeVersion,
      InstanceNeoForgeVersion: info.InstanceNeoForgeVersion,
      Mods: res
    }
    if (CompareManifests(manifest, instanceManifest, info)){
      info.InstanceBuildVersion = info.InstanceBuildVersion + 1
      manifest.InstanceVersion = info.InstanceBuildVersion
      console.log(`[BUILD] FINISH v:${info.InstanceBuildVersion}`)

      fs.writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 4))
      fs.writeFile(`${dir}/info.json`, JSON.stringify(info, null, 4))
    }
}

function AddLocalFiles(files, instanceInfo, manifestMods, rootDir){
  files.forEach(file=>{
    const path = file.path.replace(rootDir, '')
    const splitPath = path.split("/")
    const modName = splitPath.pop()
    const modInfo = {
        ModName: modName,
        ModVersion: instanceInfo.InstanceBuildVersion,
        ModLink: `[BACKEND]:.${path}`,
        ModSHA512: file.sha,
        ModServerSide: "supported",
        ModClientSide: "supported",
        ModType: 1,
        ModPath: `.${path.replace(`/${modName}`,'')}`
      }
    manifestMods.push(modInfo)
  })

}

function CompareManifests(JsonNew, JsonCur, info){
  let hasChanges = false
  for (let mod of JsonNew.Mods){
    if(mod == undefined){
      continue
    }
    let addmodInfo = undefined
    if (JsonCur && JsonCur.Mods){
      addmodInfo = JsonCur.Mods.find(x=>x.ModName == mod.ModName)
    }
    if (!addmodInfo){
      console.log(`[ADD] ${mod.ModName}`)
      hasChanges = true
      continue
    }
    if (addmodInfo.ModSHA512 == mod.ModSHA512 && addmodInfo.ModPath == mod.ModPath && addmodInfo.ModType == mod.ModType){
      mod.ModVersion = addmodInfo.ModVersion
      continue
    }
    mod.ModVersion = info.InstanceBuildVersion + 1
    console.log(`[UPDATE] ${mod.ModName}`)
    hasChanges = true
  }

  if (JsonCur == undefined || JsonCur.Mods == undefined){
    return hasChanges
  }

  for (let mod of JsonCur.Mods){
    const rmmodInfo = JsonNew.Mods.find(x=>x!=undefined && x.ModName == mod.ModName)
    if (!rmmodInfo){
      console.log(`[REMOVE] ${mod.ModName}`)
      hasChanges = true
      continue
    }
  }

  return hasChanges
}

async function GetFilesSHA(files) {
    const hashes = []
    for (let file of files){
      const sha = await utils.GetFileSHA(`./${file}`)
      hashes.push({sha: sha, path: file})
    }
    return hashes
}

async function PackLocalFiles(dir, files) {
  const allFiles = []
  files.forEach(async x=>{
    allFiles.push(utils.FindAllFiles(`${dir}/${x}`))
  })
  return Promise.all(allFiles)
}

async function HandleModList(list, info, type) {
    const loading = []
    const allMods = await FindAllMods(list, info)
    if (allMods.length <= 0) return

    projectsUrl.searchParams.set("ids",JSON.stringify(allMods.map(x=>x.project_id)))
    const data = await fetchJson(projectsUrl.toString())

    allMods.forEach(async element=>{
      loading.push(FindModVersion(element, data, type, info))
    })
    return Promise.all(loading)
}

async function FindAllMods(list, info) {
    if (list.length <= 0){return []}
    const allMods = []
    const mods = []
    const mappingMods = []
    list.forEach(element => {
        const data = element.split('/').pop().split("#")
        const id = data.at(0)
        const version = data.at(1)
        mods.push(id)
        mappingMods[id] = {id:id, version:version}
    });
    projectsUrl.searchParams.set("ids",JSON.stringify(mods))

    const data = await fetchJson(projectsUrl.toString())
    const loading = []
    data.forEach(element=>{
      element.version = mappingMods[element.slug].version
      element.dependencies = []
      loading.push(FindDependency(element, info, allMods, 4))
    })
    await Promise.all(loading)
    return allMods
}

async function FindDependency(mod, instanceInfo, accum, depth, parent) {
    while(loading>10){
      await randomDelay(100,250)
    }  
    loading++;
    depth = depth - 1
    if (depth < 0) return
    const url = new URL(`${modrinthApi}/project/${mod.id}/version`);
    url.searchParams.set("loaders", instanceInfo.InstanceForgeVersion ? '["forge"]' : '["neoforge"]');
    url.searchParams.set("game_versions", `["${instanceInfo.InstanceMCVersion}"]`);
    url.searchParams.set("include_changelog", false);
    const versions = await fetchJson(url.toString());
    const releases = versions.filter(x=>x.version_type=="release")
    let data = {}
    if (mod.version){
      data = versions.find(x=>x.id == mod.version);
    }else if(releases.length > 0){
      data = releases.at(0)
    }else{
      data = versions.at(0)
    }

    if (!data?.project_id) {
        console.log(`[WARN] ${mod.slug} - not supported by current version SKIP`)
        loading--;
        return;
    }

    if (!accum.find(x=>x.project_id == data.project_id)) {
        accum.push(data);
    }

    if (parent){
      parent.depend.push(data);
    }

    const promises = [];

    for (const dep of data.dependencies) {
        if (dep.dependency_type === "required" && dep.project_id) {
            data.depend = []
            promises.push(
                FindDependency({id:dep.project_id, version:dep.version_id, dependencies:[]}, instanceInfo, accum, depth, data)
            );
        }
    }
    loading--;
    await Promise.all(promises);
}

async function FindModVersion(modInfo, modsInfo, type, info) {
    if (modInfo == undefined){
      return
    }
    const data = modsInfo.find(x=>x.id == modInfo.project_id)
    let depend = []
    if (modInfo.depend){
      depend = modInfo.depend.map(x=>modsInfo.find(y=>y.id == x.project_id).slug)
    }
    const file = modInfo.files.at(0)
    return{
      ModName: data.slug + ".jar",
      ModSlug: data.slug,
      ModVersion: info.InstanceBuildVersion,
      ModLink: file.url,
      ModSHA512: file.hashes.sha512,
      ModServerSide: data.server_side,
      ModClientSide: data.client_side,
      ModType: type,
      ModDepend: depend.filter((e,i) => depend.indexOf(e) == i),
      ModPath: "/mods"
    }
}

async function fetchJson(url){
  return fetch(url, {
    method: 'GET',
    headers: headers,
    }).then(res=>{
        return res.json().catch(e=>console.log(e))
    }).catch(e=>console.log(e))
}

function randomDelay(minMs, maxMs) {
  const delayMs = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

HandleInstances(folderPath);