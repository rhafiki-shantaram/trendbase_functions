const axios = require('axios');
const ExcelJS = require('exceljs');

// Enhanced function to get Excel content using axios
async function getExcelContent(url, sheetName) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer', // Important for handling binary data like Excel files
            // Timeout can be adjusted or removed based on your requirements
            timeout: 15000, // Timeout after 30 seconds
        });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(response.data); // response.data is an ArrayBuffer

        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) throw new Error("Worksheet not found");

        let headers = [];
        let rows = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                headers = row.values.slice(1);
                rows.push(row.values.slice(1)); // Add headers as the first row in rows
            } else {
                rows.push(row.values.slice(1));
            }
        });

        // Convert rows to JSON
        let json = rows.map((rowValues) => {
            let rowObj = {};
            headers.forEach((header, i) => {
                rowObj[header] = rowValues[i];
            });
            return rowObj;
        });

        return json;
    } catch (error) {
        // Enhanced error handling
        console.error(`Failed to fetch or process Excel file: ${error}`);
        throw new Error(`Failed to fetch or process Excel file: ${error.message}`);
    }
}

// Function to be used in your Express route
async function getExcelData(req, res) {
    // Retrieve URL and sheetName from query parameters
    const { url, sheetName } = req.query;

    // Validate input
    if (!url || !sheetName) {
        return res.status(400).send("Missing URL or sheetName query parameters");
    }

    try {
        const data = await getExcelContent(url, sheetName);
        res.json(data);
    } catch (error) {
        console.log(`error.message: `, error.message);
        res.status(500).send(error.message);
    }
}

module.exports = { getExcelData };