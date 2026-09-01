const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Connection Setup (Neon / Cloud DB)
// Using process.env.DATABASE_URL with SSL configured for cloud hosting
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(express.json());

// Serve static assets from project root and public directory
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to serve index.html (fallback between root and public folder)
const serveIndexHtml = (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    });
};

// ==========================================================
// 1. GET ALL STOCK VIEW ITEMS
// ==========================================================
app.get('/api/stock-view', async (req, res) => {
    try {
        const query = `
            SELECT 
                it_code,
                it_desc,
                item_cat,
                item_size,
                it_unit,
                item_type,
                stock_in_hnd,
                reorderlevel,
                open_stock,
                fowd_qty,
                dayopenbal,
                dayclosebal,
                it_uprise_pur,
                it_uprise_sal,
                open_stock_date,
                proces_date,
                last_purch_date,
                rack_no,
                user_name,
                softdrbeer,
                mapit_code,
                td_special,
                pic_link,
                remarks,
                CASE 
                    WHEN stock_in_hnd <= 0 THEN 'OUT OF STOCK'
                    WHEN stock_in_hnd <= reorderlevel THEN 'LOW STOCK'
                    ELSE 'IN STOCK'
                END AS stock_status
            FROM stock_mast
            ORDER BY it_code ASC, item_size ASC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching stock view:', err);
        res.status(500).json({ error: 'Failed to retrieve stock data' });
    }
});

// ==========================================================
// 2. UPDATE SINGLE ITEM VARIANT (it_code + item_size)
// ==========================================================
app.put('/api/stock/:it_code/:item_size', async (req, res) => {
    const { it_code, item_size } = req.params;
    const {
        it_desc,
        item_cat,
        item_size: newSize,
        it_unit,
        item_type,
        stock_in_hnd,
        reorderlevel,
        open_stock,
        fowd_qty,
        dayopenbal,
        dayclosebal,
        it_uprise_pur,
        it_uprise_sal,
        open_stock_date,
        proces_date,
        last_purch_date,
        rack_no,
        user_name,
        softdrbeer,
        mapit_code,
        td_special,
        pic_link,
        remarks
    } = req.body;

    try {
        const updateQuery = `
            UPDATE stock_mast 
            SET 
                it_desc = $1,
                item_cat = $2,
                item_size = $3,
                it_unit = $4,
                item_type = $5,
                stock_in_hnd = $6,
                reorderlevel = $7,
                open_stock = $8,
                fowd_qty = $9,
                dayopenbal = $10,
                dayclosebal = $11,
                it_uprise_pur = $12,
                it_uprise_sal = $13,
                open_stock_date = $14,
                proces_date = $15,
                last_purch_date = $16,
                rack_no = $17,
                user_name = $18,
                softdrbeer = $19,
                mapit_code = $20,
                td_special = $21,
                pic_link = $22,
                remarks = $23
            WHERE it_code = $24 AND item_size = $25
        `;

        const values = [
            it_desc || null,
            item_cat || null,
            newSize || item_size,
            it_unit || null,
            item_type || null,
            stock_in_hnd ?? 0,
            reorderlevel ?? 0,
            open_stock ?? 0,
            fowd_qty || null,
            dayopenbal ?? 0,
            dayclosebal ?? 0,
            it_uprise_pur ?? 0,
            it_uprise_sal ?? 0,
            open_stock_date || null,
            proces_date || null,
            last_purch_date || null,
            rack_no || null,
            user_name || null,
            softdrbeer || null,
            mapit_code || null,
            td_special || null,
            pic_link || null,
            remarks || null,
            it_code,
            item_size
        ];

        const result = await pool.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item variant not found' });
        }

        res.json({ success: true, message: 'Stock item updated successfully' });
    } catch (err) {
        console.error('Error updating stock item:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// ==========================================================
// 3. DELETE SINGLE ITEM VARIANT (it_code + item_size)
// ==========================================================
app.delete('/api/stock/:it_code/:item_size', async (req, res) => {
    const { it_code, item_size } = req.params;

    try {
        const deleteQuery = `
            DELETE FROM stock_mast 
            WHERE it_code = $1 AND item_size = $2
        `;
        const result = await pool.query(deleteQuery, [it_code, item_size]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item variant not found' });
        }

        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// ==========================================================
// 4. FRONTEND ROUTES (ROOT & SPA CATCH-ALL)
// ==========================================================
app.get('/', serveIndexHtml);

// Catch-all route for frontend Single Page Application navigation
app.get('*', serveIndexHtml);

// Start server locally if not executing as a serverless function
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export Express app for Vercel Serverless Function engine
module.exports = app;
