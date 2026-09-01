let stockItems = [];
let filteredItems = [];
let selectedIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('detailsForm')?.addEventListener('submit', handleSave);
    document.getElementById('cancelBtn')?.addEventListener('click', resetForm);

    // Attach listeners for sidebar combo controls & search input
    document.getElementById('itemTypeSelect')?.addEventListener('change', handleTypeChange);
    document.getElementById('itemCatSelect')?.addEventListener('change', filterStockItems);

    fetchStockData();
});

// Helper Functions for Formatting Dates
function formatDateForInput(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
}

function formatDateOnly(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// 1. Fetch Stock View Data & Populate Sidebar Combos
async function fetchStockData() {
    try {
        const response = await fetch('/api/stock-view');
        if (!response.ok) throw new Error('Failed to fetch stock data');
        
        stockItems = await response.json();

        // Populate initial Type dropdown options
        populateTypeCombo(stockItems);
        
        // Populate Category dropdown based on current Type selection
        updateCategoryCombo();

        // Apply filters
        filterStockItems();
    } catch (err) {
        console.error('Error loading view data:', err);
    }
}

// Populate Item Type Dropdown
function populateTypeCombo(items) {
    const typeSelect = document.getElementById('itemTypeSelect');
    if (!typeSelect) return;

    const currentType = typeSelect.value;
    const uniqueTypes = [...new Set(items.map(i => i.item_type).filter(Boolean))].sort();

    typeSelect.innerHTML = '<option value="">All Types</option>';
    uniqueTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        if (type === currentType) opt.selected = true;
        typeSelect.appendChild(opt);
    });
}

// Handler when Item Type selection changes
function handleTypeChange() {
    updateCategoryCombo();
    filterStockItems();
}

// Update Item Category Dropdown filtered strictly by the selected Item Type
function updateCategoryCombo() {
    const typeSelect = document.getElementById('itemTypeSelect');
    const catSelect = document.getElementById('itemCatSelect');

    if (!typeSelect || !catSelect) return;

    const selectedType = typeSelect.value;
    const previousCat = catSelect.value;

    const relevantItems = selectedType 
        ? stockItems.filter(i => i.item_type === selectedType)
        : stockItems;

    const uniqueCats = [...new Set(relevantItems.map(i => i.item_cat).filter(Boolean))].sort();

    catSelect.innerHTML = '<option value="">All Categories</option>';
    
    let isPreviousCatValid = false;
    uniqueCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === previousCat) {
            opt.selected = true;
            isPreviousCatValid = true;
        }
        catSelect.appendChild(opt);
    });

    if (!isPreviousCatValid) {
        catSelect.value = '';
    }
}

// 2. Multi-Filter Logic
function filterStockItems() {
    const query = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const selectedType = document.getElementById('itemTypeSelect')?.value || '';
    const selectedCat = document.getElementById('itemCatSelect')?.value || '';

    filteredItems = stockItems.filter(item => {
        const code = (item.it_code || '').toLowerCase();
        const size = (item.item_size || '').toLowerCase();
        const combinedCodeSize = `${code} ${size}`.trim();
        const combinedSizeCode = `${size} ${code}`.trim();

        const matchesSearch = !query || 
            code.includes(query) || 
            size.includes(query) || 
            combinedCodeSize.includes(query) || 
            combinedSizeCode.includes(query);

        const matchesType = !selectedType || item.item_type === selectedType;
        const matchesCat = !selectedCat || item.item_cat === selectedCat;

        return matchesSearch && matchesType && matchesCat;
    });

    if (filteredItems.length > 0) {
        if (selectedIndex !== null && filteredItems[selectedIndex]) {
            selectSingleIndex(selectedIndex);
        } else {
            selectSingleIndex(0);
        }
    } else {
        selectedIndex = null;
        renderTable();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const typeSelect = document.getElementById('itemTypeSelect');
    if (typeSelect) typeSelect.value = '';

    updateCategoryCombo();
    filterStockItems();
}

// 3. Render Table View (Shows ALL items when Type/Category selected, 20 items on default load)
function renderTable() {
    const tbody = document.getElementById('tableData');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 15px;">No matching stock items found.</td></tr>`;
        return;
    }

    const selectedType = document.getElementById('itemTypeSelect')?.value || '';
    const selectedCat = document.getElementById('itemCatSelect')?.value || '';
    const query = document.getElementById('searchInput')?.value || '';

    // If Type, Category, or Search input is active -> Show ALL matching items
    // Otherwise (default load) -> Limit to first 20 items
    const isFiltered = Boolean(selectedType || selectedCat || query);
    const itemsToDisplay = isFiltered ? filteredItems : filteredItems.slice(0, 20);

    itemsToDisplay.forEach((item, idx) => {
        const tr = document.createElement('tr');
        
        if (idx === selectedIndex) {
            tr.classList.add('selected-row');
        }

        tr.onclick = () => selectSingleIndex(idx);

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${item.it_code}</td>
            <td>${item.it_desc || '-'}</td>
            <td>${item.item_cat || '-'}</td>
            <td>${item.item_size || '-'}</td>
            <td>${item.it_unit || '-'}</td>
            <td>${item.stock_in_hnd || 0}</td>
            <td>${parseFloat(item.it_uprise_pur || 0).toFixed(2)}</td>
            <td>${parseFloat(item.it_uprise_sal || 0).toFixed(2)}</td>
            <td>${item.stock_status}</td>
            <td>
                <span class="action-link" onclick="handleEditClick(event, ${idx})">[Edit]</span>
                <span class="action-link" onclick="deleteItem(event, '${item.it_code}', '${item.item_size}')">[Delete]</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleEditClick(e, idx) {
    e.stopPropagation();
    selectSingleIndex(idx);
}

// 4. Select Single Item & Reflect Data to Right Panel Form Controls
function selectSingleIndex(idx) {
    selectedIndex = idx;
    const item = filteredItems[idx];
    if (!item) return;

    populateForm(item);
    renderTable();
}

function populateForm(item) {
    if (document.getElementById('selectItCode')) {
        document.getElementById('selectItCode').value = item.it_code;
    }
    if (document.getElementById('selectItSize')) {
        document.getElementById('selectItSize').value = item.item_size;
    }

    if (document.getElementById('inpCode')) document.getElementById('inpCode').value = item.it_code || '';
    if (document.getElementById('inpDesc')) document.getElementById('inpDesc').value = item.it_desc || '';
    if (document.getElementById('inpCat')) document.getElementById('inpCat').value = item.item_cat || '';
    if (document.getElementById('inpSize')) document.getElementById('inpSize').value = item.item_size || '';
    if (document.getElementById('inpUnit')) document.getElementById('inpUnit').value = item.it_unit || '';
    if (document.getElementById('inpType')) document.getElementById('inpType').value = item.item_type || '';

    if (document.getElementById('inpQty')) document.getElementById('inpQty').value = item.stock_in_hnd ?? 0;
    if (document.getElementById('inpReorder')) document.getElementById('inpReorder').value = item.reorderlevel ?? 0;
    if (document.getElementById('inpOpenStock')) document.getElementById('inpOpenStock').value = item.open_stock ?? 0;
    if (document.getElementById('inpFowdQty')) document.getElementById('inpFowdQty').value = item.fowd_qty || '';
    if (document.getElementById('inpDayOpenBal')) document.getElementById('inpDayOpenBal').value = item.dayopenbal ?? 0;
    if (document.getElementById('inpDayCloseBal')) document.getElementById('inpDayCloseBal').value = item.dayclosebal ?? 0;

    if (document.getElementById('inpPurPrice')) document.getElementById('inpPurPrice').value = item.it_uprise_pur ?? 0;
    if (document.getElementById('inpSalPrice')) document.getElementById('inpSalPrice').value = item.it_uprise_sal ?? 0;

    if (document.getElementById('inpOpenStockDate')) document.getElementById('inpOpenStockDate').value = formatDateForInput(item.open_stock_date);
    if (document.getElementById('inpProcesDate')) document.getElementById('inpProcesDate').value = formatDateForInput(item.proces_date);
    if (document.getElementById('inpLastPurchDate')) document.getElementById('inpLastPurchDate').value = formatDateOnly(item.last_purch_date);

    if (document.getElementById('inpRack')) document.getElementById('inpRack').value = item.rack_no || '';
    if (document.getElementById('inpUser')) document.getElementById('inpUser').value = item.user_name || '';
    if (document.getElementById('inpSoftDrBeer')) document.getElementById('inpSoftDrBeer').value = item.softdrbeer || '';
    if (document.getElementById('inpMapItCode')) document.getElementById('inpMapItCode').value = item.mapit_code || '';
    if (document.getElementById('inpTdSpecial')) document.getElementById('inpTdSpecial').value = item.td_special || '';
    if (document.getElementById('inpPicLink')) document.getElementById('inpPicLink').value = item.pic_link || '';
    if (document.getElementById('inpRemarks')) document.getElementById('inpRemarks').value = item.remarks || '';
}

// 5. Save Changes to Database
async function handleSave(e) {
    e.preventDefault();

    const code = document.getElementById('selectItCode')?.value || document.getElementById('inpCode')?.value;
    const originalSize = document.getElementById('selectItSize')?.value || document.getElementById('inpSize')?.value;

    if (!code || !originalSize) {
        return alert('Please select a valid item variant to update.');
    }

    const payload = {
        it_desc: document.getElementById('inpDesc')?.value || null,
        item_cat: document.getElementById('inpCat')?.value || null,
        item_size: document.getElementById('inpSize')?.value || null,
        it_unit: document.getElementById('inpUnit')?.value || null,
        item_type: document.getElementById('inpType')?.value || null,

        stock_in_hnd: parseFloat(document.getElementById('inpQty')?.value || 0),
        reorderlevel: parseFloat(document.getElementById('inpReorder')?.value || 0),
        open_stock: parseFloat(document.getElementById('inpOpenStock')?.value || 0),
        fowd_qty: document.getElementById('inpFowdQty')?.value || null,
        dayopenbal: parseFloat(document.getElementById('inpDayOpenBal')?.value || 0),
        dayclosebal: parseFloat(document.getElementById('inpDayCloseBal')?.value || 0),

        it_uprise_pur: parseFloat(document.getElementById('inpPurPrice')?.value || 0),
        it_uprise_sal: parseFloat(document.getElementById('inpSalPrice')?.value || 0),

        open_stock_date: document.getElementById('inpOpenStockDate')?.value || null,
        proces_date: document.getElementById('inpProcesDate')?.value || null,
        last_purch_date: document.getElementById('inpLastPurchDate')?.value || null,

        rack_no: document.getElementById('inpRack')?.value || null,
        user_name: document.getElementById('inpUser')?.value || null,
        softdrbeer: document.getElementById('inpSoftDrBeer')?.value || null,
        mapit_code: document.getElementById('inpMapItCode')?.value || null,
        td_special: document.getElementById('inpTdSpecial')?.value || null,
        pic_link: document.getElementById('inpPicLink')?.value || null,
        remarks: document.getElementById('inpRemarks')?.value || null
    };

    try {
        const res = await fetch(`/api/stock/${encodeURIComponent(code)}/${encodeURIComponent(originalSize)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await fetchStockData();
            alert('Stock item variant updated successfully!');
        } else {
            alert('Failed to update item in database.');
        }
    } catch (err) {
        console.error('Update error:', err);
    }
}

// 6. Delete Single Variant
async function deleteItem(e, code, size) {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete item "${code}" (Size: ${size})?`)) {
        try {
            const res = await fetch(`/api/stock/${encodeURIComponent(code)}/${encodeURIComponent(size)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                selectedIndex = null;
                resetForm();
                await fetchStockData();
            } else {
                alert('Failed to delete item variant.');
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    }
}

function resetForm() {
    selectedIndex = null;
    document.getElementById('detailsForm')?.reset();
    if (document.getElementById('selectItCode')) document.getElementById('selectItCode').value = '';
    if (document.getElementById('selectItSize')) document.getElementById('selectItSize').value = '';
    renderTable();
}