const express = require('express')
const fs = require('fs');
const utils = require('./build_utils.js')
const app = express()
const port = 45565
const instancesPath = './instances'

app.get('/instances', async (req, res) => {
    const allFiles = utils.GetFilesInDirectory(instancesPath)
    const manifests = []
    allFiles.forEach(path => {
        const data = utils.ReadJson(`${instancesPath}/${path}/manifest.json`)
        manifests.push(data)
    });
    console.log(`Send manifests to client`)
    res.json(manifests)
})

app.get("/loadcontent", async (req, res)=>{
    const instanceId = req.query.id
    const allFiles = utils.GetFilesInDirectory(instancesPath)
    const manifests = []
    allFiles.forEach(path => {
        const data = utils.ReadJson(`${instancesPath}/${path}/manifest.json`)
        manifests.push(data)
    });

    if (!manifests.some(x=>x.InstanceId == instanceId)){
        console.log(`fail ${req.query.id} must exists`)
        res.send("FileNotFound")
        return
    }
    const filePath = req.query.filePath
    if (filePath.split("..").length - 1 > 0){
        console.log(`fail ${filePath} abuse filepath?`)
        res.send("FileNotFound")
        return
    }

    const path =  `${__dirname}/${instancesPath}/${instanceId}/${filePath}`
    const fileName = filePath.split('/').pop()
    if (!fs.existsSync(path)){
        console.log(`fail send file ${fileName} to client`)
        res.send("FileNotFound")
        return
    }
    console.log(`Send file ${fileName} to client`)
    res.download(path, fileName)
})

app.get("/launcher", async (req, res)=>{
    const path =  `${__dirname}/launcher.zip`
    if (!fs.existsSync(path)){
        console.log(`fail send launcher to client`)
        res.send("FileNotFound")
        return
    }
    console.log(`Send launcher to client`)
    res.download(path, "launcher.zip")
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
