const express = require("express");
const {scrapeLogic} = require("./scrapeLogic") 
const {getExcelData} = require("./getExcelData") 

const app = express();

const PORT = process.env.port || 4000;

app.listen(4000, () => {
    console.log(`listeniing on ${PORT}`);
})

app.get("/scrape", (req,res) => {
    scrapeLogic(res);
})

app.get("/getExcelData", (req, res) => {
    getExcelData(req, res); // Corrected to pass both req and res
});

app.get("/", (req,res) => {
    res.send("server up and running..")
})