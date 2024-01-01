const puppeteer = require('puppeteer');
const axios = require('axios');
require("dotenv").config();

const scrapeLogic = async(res) => {
    const browser = await puppeteer.launch({
        args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
            "--enable-gpu"
        ],
        executablePath: process.env.NODE_ENV === 'production' ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath()
    });

    let page;
    let stockData;

    try {
        page = await browser.newPage();

        // Navigate to the specified page and log in
        await page.goto('https://b.gfn.cainiao.com/dist/orderFrame#/abnor/outbound', { waitUntil: 'networkidle0' });
        console.log(`browser launched`);
        await page.waitForSelector('#username');
        await page.type('#username', '17609048951');
        await page.waitForSelector('#passwordOrg');
        await page.type('#passwordOrg', 'linghang123456');
        await page.click('#signbtn');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // Click the specified button
        const buttonSelector = '#ice-container div[class^="ProcessGuidance--ProcessWrap--"] div[class^="ProcessGuidance--buttonStyle--"] button';
        await page.waitForSelector(buttonSelector);
        await page.click(buttonSelector);
        await new Promise(r => setTimeout(r, 3000));

        // Expand menu options, click the first list item and wait
        await page.click('.index-slider .slider-wrapper');
        await new Promise(r => setTimeout(r, 1000));
        await page.click('.ant-menu.ant-menu-inline.ant-menu-sub li:first-child');
        await new Promise(r => setTimeout(r, 1000));

        // Change dropdown selection
        await page.click('.next-pagination-size-selector .next-select.next-select-trigger');
        await page.waitForSelector('.next-overlay-inner.next-select-spacing-tb');
        await page.evaluate(() => {
            document.querySelectorAll('.next-overlay-inner.next-select-spacing-tb .next-menu-item-text')
                .forEach(element => {
                    if (element.innerText === '500') {
                        element.click();
                    }
                });
        });
        await new Promise(r => setTimeout(r, 3000));

        // Check if the table has data with a retry limit
        const maxRetries = 5;
        let hasData = false;
        let retryCount = 0;
        while (!hasData && retryCount < maxRetries) {
            hasData = await page.evaluate(() => {
                const rows = document.querySelectorAll('.next-table-body tbody .next-table-row');
                return rows.length > 0;
            });
            if (!hasData) {
                console.log(`Retry ${retryCount + 1}: Table data not found, reloading...`);
                await page.reload({ waitUntil: 'networkidle0' });
                await new Promise(r => setTimeout(r, 1000));
                retryCount++;
            }
        }

        if (hasData) {
            const tableData = await extractTableData(page);
            stockData = transformData(tableData);
            // Send the scraped data directly to the Wix endpoint
            try {
                const url = 'https://trendyadventurer.wixstudio.io/tb-redo/_functions/recieveStockData';
                const response = await axios.post(url, stockData, {
                    headers: { 'Content-Type': 'application/json' }
                });
    
                console.log('Data array sent successfully. Server response:', response.data);
            } catch (error) {
                if (error.response) {
                    console.error('Server responded with an error:', error.response.status, error.response.data);
                } else if (error.request) {
                    console.error('No response received:', error.request);
                } else {
                    console.error('Error setting up the request:', error.message);
                }
            }
        } else {
            console.log("Data not found after " + maxRetries + " retries.");
        }

        // Identify the user menu and hover over it
        const userMenuSelector = '.user-menu.ant-dropdown-link.ant-dropdown-trigger';
        await page.hover(userMenuSelector);

        // Wait for the dropdown to be visible
        await page.waitForSelector('.ant-dropdown.ant-dropdown-placement-bottomRight', { visible: true });

        // Click the logout item in the dropdown
        await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.ant-dropdown-menu-item'));
            const logoutItem = items.find(item => item.textContent.includes('退出登录'));
            if (logoutItem) {
                logoutItem.click();
            }
        });

        // Wait for the logout screen to load
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

    } catch (e) {
        console.error(`Error: ${e}`);
        res.send(`Error: ${e}`);
    } finally {
        if (browser) {
            await browser.close();
            res.send(stockData);
        }
    }
}


async function extractTableData(page) {
    return await page.evaluate(() => {
        let data = { headers: [], rows: [] };

        // Extract headers
        const headerCells = document.querySelectorAll('.next-table-header .next-table-cell.next-table-header-node .next-table-cell-wrapper');
        headerCells.forEach(cell => {
            data.headers.push(cell.innerText.trim());
        });

        // Extract rows
        const rows = document.querySelectorAll('.next-table-body tbody .next-table-row');
        rows.forEach(row => {
            let rowData = [];
            const cells = row.querySelectorAll('td .next-table-cell-wrapper');
            cells.forEach(cell => {
                rowData.push(cell.innerText.trim());
            });
            data.rows.push(rowData);
        });

        return data;
    });
}

function transformData(data) {
    const transformed = data.rows.map(row => {
        let obj = {};
        row.forEach((value, index) => {
            obj[data.headers[index]] = value;
        });
        return obj;
    });
    return transformed;
}

// Function to check if table has data
async function checkTableData(page) {
    return await page.evaluate(() => {
        const rows = document.querySelectorAll('.next-table-body tbody .next-table-row');
        return rows.length > 0;
    });
}


module.exports = { scrapeLogic };
