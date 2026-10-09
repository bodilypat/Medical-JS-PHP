/**
 * Frontend/js/inventory.js
 * Medical Management System
 *
 * Inventory CRUD operations, stock adjustments,
 * searching, filtering, pagination, and UI handling.
 *
 * Expected API endpoints:
 * GET  /inventory/list.php
 * GET  /inventory/get.php?id=123
 * POST /inventory/create.php
 * POST /inventory/update.php
 * POST /inventory/delete.php
 * POST /inventory/adjust-stock.php
 * POST /inventory/transfer.php
 */

(function (window) {
    'use strict';

    if (!window.API) {
        console.error('inventory.js requires api.js to be loaded first.');
        return;
    }

    const state = {
        inventory: [],
        currentItem: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        category: '',
        status: '',
        locationId: '',
        supplierId: '',
        itemType: '',
        lowStock: false,
        outOfStock: false,
        expiryFrom: '',
        expiryTo: '',

        loading: false
    };

    const endpoints = {
        list: '/inventory/list.php',
        get: '/inventory/get.php',
        create: '/inventory/create.php',
        update: '/inventory/update.php',
        delete: '/inventory/delete.php',
        adjustStock: '/inventory/adjust-stock.php',
        transfer: '/inventory/transfer.php'
    };

    /* =========================================================
       Utilities
       ========================================================= */

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function getValue(selector, defaultValue = '') {
        const element = getElement(selector);

        if (!element) {
            return defaultValue;
        }

        return element.value !== undefined
            ? element.value.trim()
            : defaultValue;
    }

    function showMessage(
        message,
        type = 'success',
        selector = '#inventoryMessage'
    ) {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.className = `message message-${type}`;
        element.hidden = !message;
    }

    function clearMessage(selector = '#inventoryMessage') {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = '';
        element.hidden = true;
    }

    function setLoading(loading, button = null) {
        state.loading = loading;

        if (!button) {
            return;
        }

        button.disabled = loading;

        if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Processing...';
        } else if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }

    function capitalize(value) {
        if (!value) {
            return '';
        }

        return String(value)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    function formatDate(value) {
        if (!value) {
            return '—';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }

        return date.toLocaleDateString();
    }

    function formatDateTime(value) {
        if (!value) {
            return '—';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }

        return date.toLocaleString();
    }

    function formatCurrency(value, currency = 'USD') {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return '—';
        }

        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency
        }).format(amount);
    }

    function getItemId(item) {
        return item?.id ??
            item?.inventory_id ??
            item?.item_id ??
            '';
    }

    function getItemName(item) {
        return item?.item_name ??
            item?.name ??
            item?.product_name ??
            item?.medicine_name ??
            '';
    }

    function getQuantity(item) {
        const quantity =
            item?.quantity ??
            item?.stock_quantity ??
            item?.current_stock ??
            item?.stock ??
            0;

        const number = Number(quantity);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function getReorderLevel(item) {
        const value =
            item?.reorder_level ??
            item?.minimum_stock ??
            item?.min_stock ??
            0;

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function getExpiryDate(item) {
        return item?.expiry_date ??
            item?.expiration_date ??
            item?.expires_at ??
            '';
    }

    function isLowStock(item) {
        return (
            getQuantity(item) <=
            getReorderLevel(item)
        );
    }

    function isOutOfStock(item) {
        return getQuantity(item) <= 0;
    }

    function isExpired(item) {
        const expiry = getExpiryDate(item);

        if (!expiry) {
            return false;
        }

        const expiryDate = new Date(expiry);

        if (Number.isNaN(expiryDate.getTime())) {
            return false;
        }

        return expiryDate < new Date();
    }

    function getStockClass(item) {
        if (isExpired(item)) {
            return 'stock-expired';
        }

        if (isOutOfStock(item)) {
            return 'stock-out';
        }

        if (isLowStock(item)) {
            return 'stock-low';
        }

        return 'stock-ok';
    }

    function getStatusClass(status) {
        const normalized = String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `status-${normalized}`;
    }

    /* =========================================================
       API Operations
       ========================================================= */

    async function list(options = {}) {
        const params = new URLSearchParams();

        const page =
            options.page ??
            state.currentPage;

        const limit =
            options.limit ??
            state.perPage;

        params.set('page', page);
        params.set('limit', limit);

        const search =
            options.search ??
            state.search;

        const category =
            options.category ??
            state.category;

        const status =
            options.status ??
            state.status;

        const locationId =
            options.location_id ??
            state.locationId;

        const supplierId =
            options.supplier_id ??
            state.supplierId;

        const itemType =
            options.item_type ??
            state.itemType;

        const lowStock =
            options.low_stock ??
            state.lowStock;

        const outOfStock =
            options.out_of_stock ??
            state.outOfStock;

        const expiryFrom =
            options.expiry_from ??
            state.expiryFrom;

        const expiryTo =
            options.expiry_to ??
            state.expiryTo;

        if (search) {
            params.set('search', search);
        }

        if (category) {
            params.set('category', category);
        }

        if (status) {
            params.set('status', status);
        }

        if (locationId) {
            params.set('location_id', locationId);
        }

        if (supplierId) {
            params.set('supplier_id', supplierId);
        }

        if (itemType) {
            params.set('item_type', itemType);
        }

        if (lowStock) {
            params.set('low_stock', '1');
        }

        if (outOfStock) {
            params.set('out_of_stock', '1');
        }

        if (expiryFrom) {
            params.set('expiry_from', expiryFrom);
        }

        if (expiryTo) {
            params.set('expiry_to', expiryTo);
        }

        try {
            setLoading(true);

            const query = params.toString();

            const url = query
                ? `${endpoints.list}?${query}`
                : endpoints.list;

            const response = await API.get(url);

            let inventory = [];
            let total = 0;

            if (Array.isArray(response)) {
                inventory = response;
                total = response.length;
            } else if (
                Array.isArray(response?.data?.inventory)
            ) {
                inventory = response.data.inventory;

                total = Number(
                    response.data.total ??
                    response.total ??
                    inventory.length
                );
            } else if (
                Array.isArray(response?.inventory)
            ) {
                inventory = response.inventory;

                total = Number(
                    response.total ??
                    inventory.length
                );
            } else if (
                Array.isArray(response?.data)
            ) {
                inventory = response.data;

                total = Number(
                    response.total ??
                    inventory.length
                );
            }

            state.inventory = inventory;
            state.currentPage =
                Number(page) || 1;

            state.perPage =
                Number(limit) || 10;

            state.total =
                Number.isFinite(total)
                    ? total
                    : inventory.length;

            renderInventoryTable(
                state.inventory
            );

            renderPagination(
                state.total,
                state.currentPage,
                state.perPage
            );

            return response;
        } catch (error) {
            console.error(
                'Failed to load inventory:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to load inventory.',
                'error'
            );

            return null;
        } finally {
            setLoading(false);
        }
    }

    async function get(id) {
        if (!id) {
            throw new Error(
                'Inventory item ID is required.'
            );
        }

        try {
            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            const item =
                response?.data?.inventory ??
                response?.data?.item ??
                response?.inventory ??
                response?.item ??
                response?.data ??
                response;

            state.currentItem = item;

            return item;
        } catch (error) {
            console.error(
                'Failed to retrieve inventory item:',
                error
            );

            throw error;
        }
    }

    async function create(itemData) {
        const data =
            normalizeInventoryData(itemData);

        const validation =
            validateInventory(data);

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        try {
            return await API.post(
                endpoints.create,
                data
            );
        } catch (error) {
            console.error(
                'Failed to create inventory item:',
                error
            );

            throw error;
        }
    }

    async function update(id, itemData) {
        if (!id) {
            throw new Error(
                'Inventory item ID is required.'
            );
        }

        const data =
            normalizeInventoryData(itemData);

        const validation =
            validateInventory(
                data,
                true
            );

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        data.id = id;
        data.inventory_id = id;
        data.item_id = id;

        try {
            return await API.post(
                endpoints.update,
                data
            );
        } catch (error) {
            console.error(
                'Failed to update inventory item:',
                error
            );

            throw error;
        }
    }

    async function remove(id) {
        if (!id) {
            throw new Error(
                'Inventory item ID is required.'
            );
        }

        try {
            return await API.post(
                endpoints.delete,
                {
                    id,
                    inventory_id: id,
                    item_id: id
                }
            );
        } catch (error) {
            console.error(
                'Failed to delete inventory item:',
                error
            );

            throw error;
        }
    }

    async function adjustStock(data = {}) {
        const itemId =
            data.id ??
            data.inventory_id ??
            data.item_id ??
            '';

        if (!itemId) {
            throw new Error(
                'Inventory item ID is required.'
            );
        }

        const quantity =
            Number(data.quantity);

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            throw new Error(
                'Stock quantity must be greater than zero.'
            );
        }

        const adjustmentType =
            data.adjustment_type ??
            data.type ??
            'add';

        const allowedTypes = [
            'add',
            'remove',
            'increase',
            'decrease',
            'set'
        ];

        if (
            !allowedTypes.includes(
                adjustmentType
            )
        ) {
            throw new Error(
                'Invalid stock adjustment type.'
            );
        }

        const payload = {
            id: itemId,
            inventory_id: itemId,
            item_id: itemId,

            quantity,

            adjustment_type:
                adjustmentType,

            reason:
                data.reason ??
                '',

            reference:
                data.reference ??
                '',

            notes:
                data.notes ??
                '',

            location_id:
                data.location_id ??
                '',

            adjusted_by:
                data.adjusted_by ??
                ''
        };

        try {
            return await API.post(
                endpoints.adjustStock,
                payload
            );
        } catch (error) {
            console.error(
                'Failed to adjust inventory stock:',
                error
            );

            throw error;
        }
    }

    async function transfer(data = {}) {
        const itemId =
            data.id ??
            data.inventory_id ??
            data.item_id ??
            '';

        if (!itemId) {
            throw new Error(
                'Inventory item ID is required.'
            );
        }

        if (!data.from_location_id) {
            throw new Error(
                'Source location is required.'
            );
        }

        if (!data.to_location_id) {
            throw new Error(
                'Destination location is required.'
            );
        }

        if (
            String(data.from_location_id) ===
            String(data.to_location_id)
        ) {
            throw new Error(
                'Source and destination locations must be different.'
            );
        }

        const quantity =
            Number(data.quantity);

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            throw new Error(
                'Transfer quantity must be greater than zero.'
            );
        }

        const payload = {
            id: itemId,
            inventory_id: itemId,
            item_id: itemId,

            from_location_id:
                data.from_location_id,

            to_location_id:
                data.to_location_id,

            quantity,

            reason:
                data.reason ??
                '',

            notes:
                data.notes ??
                '',

            transferred_by:
                data.transferred_by ??
                ''
        };

        try {
            return await API.post(
                endpoints.transfer,
                payload
            );
        } catch (error) {
            console.error(
                'Failed to transfer inventory:',
                error
            );

            throw error;
        }
    }

    /* =========================================================
       Search / Filtering
       ========================================================= */

    async function search(term) {
        state.search =
            String(term || '').trim();

        state.currentPage = 1;

        return list({
            page: 1,
            search: state.search
        });
    }

    async function filter(filters = {}) {
        state.search =
            filters.search ??
            state.search;

        state.category =
            filters.category ??
            '';

        state.status =
            filters.status ??
            '';

        state.locationId =
            filters.location_id ??
            filters.locationId ??
            '';

        state.supplierId =
            filters.supplier_id ??
            filters.supplierId ??
            '';

        state.itemType =
            filters.item_type ??
            filters.itemType ??
            '';

        state.lowStock =
            Boolean(
                filters.low_stock ??
                filters.lowStock ??
                false
            );

        state.outOfStock =
            Boolean(
                filters.out_of_stock ??
                filters.outOfStock ??
                false
            );

        state.expiryFrom =
            filters.expiry_from ??
            filters.expiryFrom ??
            '';

        state.expiryTo =
            filters.expiry_to ??
            filters.expiryTo ??
            '';

        state.currentPage = 1;

        return list({
            page: 1,
            search: state.search,
            category: state.category,
            status: state.status,
            location_id: state.locationId,
            supplier_id: state.supplierId,
            item_type: state.itemType,
            low_stock: state.lowStock,
            out_of_stock: state.outOfStock,
            expiry_from: state.expiryFrom,
            expiry_to: state.expiryTo
        });
    }

    async function clearFilters() {
        state.search = '';
        state.category = '';
        state.status = '';
        state.locationId = '';
        state.supplierId = '';
        state.itemType = '';
        state.lowStock = false;
        state.outOfStock = false;
        state.expiryFrom = '';
        state.expiryTo = '';
        state.currentPage = 1;

        const selectors = [
            '#inventorySearch',
            '#inventoryCategoryFilter',
            '#inventoryStatusFilter',
            '#inventoryLocationFilter',
            '#inventorySupplierFilter',
            '#inventoryTypeFilter',
            '#inventoryExpiryFrom',
            '#inventoryExpiryTo'
        ];

        selectors.forEach(selector => {
            const element =
                getElement(selector);

            if (element) {
                element.value = '';
            }
        });

        const lowStock =
            getElement(
                '#inventoryLowStockFilter'
            );

        if (lowStock) {
            lowStock.checked = false;
        }

        const outOfStock =
            getElement(
                '#inventoryOutOfStockFilter'
            );

        if (outOfStock) {
            outOfStock.checked = false;
        }

        return list({
            page: 1,
            search: '',
            category: '',
            status: '',
            location_id: '',
            supplier_id: '',
            item_type: '',
            low_stock: false,
            out_of_stock: false,
            expiry_from: '',
            expiry_to: ''
        });
    }

    /* =========================================================
       Pagination
       ========================================================= */

    function goToPage(page) {
        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    state.total /
                    state.perPage
                )
            );

        const targetPage =
            Math.max(
                1,
                Math.min(
                    Number(page) || 1,
                    totalPages
                )
            );

        state.currentPage =
            targetPage;

        return list({
            page: targetPage,
            limit: state.perPage
        });
    }

    function nextPage() {
        const totalPages =
            Math.ceil(
                state.total /
                state.perPage
            );

        if (
            state.currentPage >=
            totalPages
        ) {
            return Promise.resolve(null);
        }

        return goToPage(
            state.currentPage + 1
        );
    }

    function previousPage() {
        if (
            state.currentPage <= 1
        ) {
            return Promise.resolve(null);
        }

        return goToPage(
            state.currentPage - 1
        );
    }

    /* =========================================================
       Validation / Normalization
       ========================================================= */

    function validateInventory(
        data,
        isUpdate = false
    ) {
        const errors = [];

        if (
            !isUpdate &&
            !data.item_name
        ) {
            errors.push(
                'Item name is required.'
            );
        }

        if (
            data.quantity !== '' &&
            data.quantity !== null &&
            data.quantity !== undefined
        ) {
            const quantity =
                Number(data.quantity);

            if (
                !Number.isFinite(quantity) ||
                quantity < 0
            ) {
                errors.push(
                    'Quantity must be zero or greater.'
                );
            }
        }

        if (
            data.reorder_level !== '' &&
            data.reorder_level !== null &&
            data.reorder_level !== undefined
        ) {
            const reorderLevel =
                Number(
                    data.reorder_level
                );

            if (
                !Number.isFinite(
                    reorderLevel
                ) ||
                reorderLevel < 0
            ) {
                errors.push(
                    'Reorder level must be zero or greater.'
                );
            }
        }

        if (
            data.unit_cost !== '' &&
            data.unit_cost !== null &&
            data.unit_cost !== undefined
        ) {
            const unitCost =
                Number(
                    data.unit_cost
                );

            if (
                !Number.isFinite(
                    unitCost
                ) ||
                unitCost < 0
            ) {
                errors.push(
                    'Unit cost must be zero or greater.'
                );
            }
        }

        if (
            data.unit_price !== '' &&
            data.unit_price !== null &&
            data.unit_price !== undefined
        ) {
            const unitPrice =
                Number(
                    data.unit_price
                );

            if (
                !Number.isFinite(
                    unitPrice
                ) ||
                unitPrice < 0
            ) {
                errors.push(
                    'Unit price must be zero or greater.'
                );
            }
        }

        if (
            data.expiry_date &&
            Number.isNaN(
                new Date(
                    data.expiry_date
                ).getTime()
            )
        ) {
            errors.push(
                'Expiry date is invalid.'
            );
        }

        if (
            data.manufacturing_date &&
            Number.isNaN(
                new Date(
                    data.manufacturing_date
                ).getTime()
            )
        ) {
            errors.push(
                'Manufacturing date is invalid.'
            );
        }

        if (
            data.supplier_id &&
            !/^\d+$/.test(
                String(data.supplier_id)
            )
        ) {
            errors.push(
                'Supplier ID must be numeric.'
            );
        }

        if (
            data.location_id &&
            !/^\d+$/.test(
                String(data.location_id)
            )
        ) {
            errors.push(
                'Location ID must be numeric.'
            );
        }

        return {
            valid:
                errors.length === 0,

            errors
        };
    }

    function normalizeInventoryData(
        data = {}
    ) {
        return {
            item_name:
                data.item_name ??
                data.name ??
                data.product_name ??
                data.medicine_name ??
                '',

            item_code:
                data.item_code ??
                data.code ??
                '',

            item_type:
                data.item_type ??
                data.type ??
                '',

            category:
                data.category ??
                '',

            description:
                data.description ??
                '',

            generic_name:
                data.generic_name ??
                '',

            brand_name:
                data.brand_name ??
                '',

            dosage_form:
                data.dosage_form ??
                '',

            strength:
                data.strength ??
                '',

            unit:
                data.unit ??
                '',

            manufacturer:
                data.manufacturer ??
                '',

            supplier_id:
                data.supplier_id ??
                '',

            location_id:
                data.location_id ??
                '',

            batch_number:
                data.batch_number ??
                data.batch ??
                '',

            manufacturing_date:
                data.manufacturing_date ??
                '',

            expiry_date:
                data.expiry_date ??
                data.expiration_date ??
                '',

            quantity:
                data.quantity ??
                data.stock_quantity ??
                data.current_stock ??
                '',

            reorder_level:
                data.reorder_level ??
                data.minimum_stock ??
                data.min_stock ??
                '',

            unit_cost:
                data.unit_cost ??
                data.cost_price ??
                '',

            unit_price:
                data.unit_price ??
                data.selling_price ??
                '',

            tax_rate:
                data.tax_rate ??
                '',

            status:
                data.status ??
                'active',

            storage_conditions:
                data.storage_conditions ??
                '',

            prescription_required:
                data.prescription_required ??
                false,

            notes:
                data.notes ??
                ''
        };
    }

    /* =========================================================
       Form Handling
       ========================================================= */

    function formToObject(form) {
        if (!form) {
            return {};
        }

        const formData =
            new FormData(form);

        const data = {};

        formData.forEach(
            (value, key) => {
                if (
                    data[key] !==
                    undefined
                ) {
                    if (
                        !Array.isArray(
                            data[key]
                        )
                    ) {
                        data[key] = [
                            data[key]
                        ];
                    }

                    data[key].push(value);
                } else {
                    data[key] = value;
                }
            }
        );

        form.querySelectorAll(
            'input[type="checkbox"][name]'
        ).forEach(input => {
            data[input.name] =
                input.checked;
        });

        return data;
    }

    async function submitCreateForm(
        form
    ) {
        const targetForm =
            typeof form === 'string'
                ? getElement(form)
                : form;

        if (!targetForm) {
            throw new Error(
                'Create inventory form was not found.'
            );
        }

        const button =
            targetForm.querySelector(
                '[type="submit"]'
            );

        clearMessage();

        try {
            setLoading(
                true,
                button
            );

            const data =
                formToObject(
                    targetForm
                );

            await create(data);

            showMessage(
                'Inventory item created successfully.',
                'success'
            );

            targetForm.reset();

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to create inventory item.',
                'error'
            );

            return false;
        } finally {
            setLoading(
                false,
                button
            );
        }
    }

    async function submitUpdateForm(
        form
    ) {
        const targetForm =
            typeof form === 'string'
                ? getElement(form)
                : form;

        if (!targetForm) {
            throw new Error(
                'Edit inventory form was not found.'
            );
        }

        const id =
            targetForm.dataset.id ||
            targetForm.querySelector(
                '[name="id"]'
            )?.value ||
            targetForm.querySelector(
                '[name="inventory_id"]'
            )?.value ||
            targetForm.querySelector(
                '[name="item_id"]'
            )?.value;

        if (!id) {
            showMessage(
                'Inventory item ID is required.',
                'error'
            );

            return false;
        }

        const button =
            targetForm.querySelector(
                '[type="submit"]'
            );

        clearMessage();

        try {
            setLoading(
                true,
                button
            );

            const data =
                formToObject(
                    targetForm
                );

            await update(
                id,
                data
            );

            showMessage(
                'Inventory item updated successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to update inventory item.',
                'error'
            );

            return false;
        } finally {
            setLoading(
                false,
                button
            );
        }
    }

    /* =========================================================
       Confirmation Operations
       ========================================================= */

    async function deleteWithConfirmation(
        id
    ) {
        if (!id) {
            return false;
        }

        const confirmed =
            window.confirm(
                'Are you sure you want to delete this inventory item?'
            );

        if (!confirmed) {
            return false;
        }

        try {
            await remove(id);

            showMessage(
                'Inventory item deleted successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to delete inventory item.',
                'error'
            );

            return false;
        }
    }

    async function adjustStockWithConfirmation(
        data
    ) {
        const quantity =
            Number(data?.quantity);

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            showMessage(
                'Enter a valid stock quantity.',
                'error'
            );

            return false;
        }

        const type =
            data?.adjustment_type ??
            data?.type ??
            'add';

        const actionText =
            type === 'remove' ||
            type === 'decrease'
                ? 'remove from'
                : type === 'set'
                    ? 'set for'
                    : 'add to';

        const confirmed =
            window.confirm(
                `Are you sure you want to ${actionText} inventory stock?`
            );

        if (!confirmed) {
            return false;
        }

        try {
            await adjustStock(data);

            showMessage(
                'Inventory stock adjusted successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to adjust inventory stock.',
                'error'
            );

            return false;
        }
    }

    async function transferWithConfirmation(
        data
    ) {
        const quantity =
            Number(data?.quantity);

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            showMessage(
                'Enter a valid transfer quantity.',
                'error'
            );

            return false;
        }

        const confirmed =
            window.confirm(
                `Transfer ${quantity} unit(s) to the selected location?`
            );

        if (!confirmed) {
            return false;
        }

        try {
            await transfer(data);

            showMessage(
                'Inventory transferred successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to transfer inventory.',
                'error'
            );

            return false;
        }
    }

    /* =========================================================
       Rendering
       ========================================================= */

    function renderInventoryTable(
        inventory = state.inventory,
        selector = '#inventoryTableBody'
    ) {
        const tbody =
            getElement(selector);

        if (!tbody) {
            return;
        }

        if (
            !Array.isArray(
                inventory
            ) ||
            inventory.length === 0
        ) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="13"
                        class="empty-state">
                        No inventory records found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            inventory.map(item => {
                const id =
                    getItemId(item);

                const name =
                    getItemName(item);

                const quantity =
                    getQuantity(item);

                const reorderLevel =
                    getReorderLevel(item);

                const expiryDate =
                    getExpiryDate(item);

                const lowStock =
                    isLowStock(item);

                const outOfStock =
                    isOutOfStock(item);

                const expired =
                    isExpired(item);

                return `
                    <tr
                        data-id="${escapeHtml(id)}">

                        <td>
                            ${escapeHtml(id)}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(name)}
                            </strong>

                            ${
                                item.item_code
                                    ? `
                                        <small>
                                            ${escapeHtml(
                                                item.item_code
                                            )}
                                        </small>
                                      `
                                    : ''
                            }
                        </td>

                        <td>
                            ${escapeHtml(
                                item.item_type ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.category ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.location_name ||
                                item.location ||
                                '—'
                            )}
                        </td>

                        <td>
                            <span
                                class="${getStockClass(item)}">
                                ${escapeHtml(
                                    quantity
                                )}
                            </span>

                            ${
                                reorderLevel
                                    ? `
                                        <small>
                                            /
                                            ${escapeHtml(
                                                reorderLevel
                                            )}
                                            min
                                        </small>
                                      `
                                    : ''
                            }
                        </td>

                        <td>
                            ${escapeHtml(
                                item.unit ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                item.unit_cost
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                expiryDate
                            )}
                        </td>

                        <td>
                            <span
                                class="status-badge ${getStatusClass(
                                    item.status
                                )}">
                                ${escapeHtml(
                                    capitalize(
                                        item.status ||
                                        'active'
                                    )
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                lowStock &&
                                !outOfStock
                                    ? `
                                        <span
                                            class="badge badge-warning">
                                            Low Stock
                                        </span>
                                      `
                                    : ''
                            }

                            ${
                                outOfStock
                                    ? `
                                        <span
                                            class="badge badge-danger">
                                            Out of Stock
                                        </span>
                                      `
                                    : ''
                            }

                            ${
                                expired
                                    ? `
                                        <span
                                            class="badge badge-danger">
                                            Expired
                                        </span>
                                      `
                                    : ''
                            }
                        </td>

                        <td class="actions">

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="view-inventory"
                                data-id="${escapeHtml(id)}">
                                View
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="edit-inventory"
                                data-id="${escapeHtml(id)}">
                                Edit
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="adjust-stock"
                                data-id="${escapeHtml(id)}">
                                Stock
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="transfer-inventory"
                                data-id="${escapeHtml(id)}">
                                Transfer
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm btn-danger"
                                data-action="delete-inventory"
                                data-id="${escapeHtml(id)}">
                                Delete
                            </button>

                        </td>
                    </tr>
                `;
            }).join('');
    }

    function renderPagination(
        total = state.total,
        page = state.currentPage,
        limit = state.perPage,
        selector = '#inventoryPagination'
    ) {
        const container =
            getElement(selector);

        if (!container) {
            return;
        }

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    Number(total) /
                    Number(limit)
                )
            );

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button
                type="button"
                data-page="${Math.max(
                    1,
                    page - 1
                )}"
                ${page <= 1
                    ? 'disabled'
                    : ''}>
                Previous
            </button>
        `;

        for (
            let i = 1;
            i <= totalPages;
            i++
        ) {
            if (
                i === 1 ||
                i === totalPages ||
                Math.abs(i - page) <= 2
            ) {
                html += `
                    <button
                        type="button"
                        data-page="${i}"
                        class="${
                            i === page
                                ? 'active'
                                : ''
                        }">
                        ${i}
                    </button>
                `;
            } else if (
                i === page - 3 ||
                i === page + 3
            ) {
                html += `
                    <span
                        class="pagination-ellipsis">
                        …
                    </span>
                `;
            }
        }

        html += `
            <button
                type="button"
                data-page="${Math.min(
                    totalPages,
                    page + 1
                )}"
                ${page >= totalPages
                    ? 'disabled'
                    : ''}>
                Next
            </button>
        `;

        container.innerHTML = html;
    }

    async function showDetails(
        id,
        containerSelector =
            '#inventoryDetails'
    ) {
        const container =
            getElement(
                containerSelector
            );

        if (!container) {
            return null;
        }

        try {
            const item =
                await get(id);

            const quantity =
                getQuantity(item);

            const reorderLevel =
                getReorderLevel(item);

            container.innerHTML = `
                <div class="inventory-details">

                    <h3>
                        ${escapeHtml(
                            getItemName(item)
                        )}
                    </h3>

                    <dl>

                        <dt>Inventory ID</dt>
                        <dd>
                            ${escapeHtml(
                                getItemId(item)
                            )}
                        </dd>

                        <dt>Item Code</dt>
                        <dd>
                            ${escapeHtml(
                                item.item_code ||
                                '—'
                            )}
                        </dd>

                        <dt>Item Type</dt>
                        <dd>
                            ${escapeHtml(
                                item.item_type ||
                                '—'
                            )}
                        </dd>

                        <dt>Category</dt>
                        <dd>
                            ${escapeHtml(
                                item.category ||
                                '—'
                            )}
                        </dd>

                        <dt>Description</dt>
                        <dd>
                            ${escapeHtml(
                                item.description ||
                                '—'
                            )}
                        </dd>

                        <dt>Generic Name</dt>
                        <dd>
                            ${escapeHtml(
                                item.generic_name ||
                                '—'
                            )}
                        </dd>

                        <dt>Brand Name</dt>
                        <dd>
                            ${escapeHtml(
                                item.brand_name ||
                                '—'
                            )}
                        </dd>

                        <dt>Manufacturer</dt>
                        <dd>
                            ${escapeHtml(
                                item.manufacturer ||
                                '—'
                            )}
                        </dd>

                        <dt>Supplier</dt>
                        <dd>
                            ${escapeHtml(
                                item.supplier_name ||
                                item.supplier ||
                                '—'
                            )}
                        </dd>

                        <dt>Location</dt>
                        <dd>
                            ${escapeHtml(
                                item.location_name ||
                                item.location ||
                                '—'
                            )}
                        </dd>

                        <dt>Batch Number</dt>
                        <dd>
                            ${escapeHtml(
                                item.batch_number ||
                                '—'
                            )}
                        </dd>

                        <dt>Quantity</dt>
                        <dd>
                            ${escapeHtml(
                                quantity
                            )}
                        </dd>

                        <dt>Reorder Level</dt>
                        <dd>
                            ${escapeHtml(
                                reorderLevel
                            )}
                        </dd>

                        <dt>Unit</dt>
                        <dd>
                            ${escapeHtml(
                                item.unit ||
                                '—'
                            )}
                        </dd>

                        <dt>Unit Cost</dt>
                        <dd>
                            ${formatCurrency(
                                item.unit_cost
                            )}
                        </dd>

                        <dt>Unit Price</dt>
                        <dd>
                            ${formatCurrency(
                                item.unit_price
                            )}
                        </dd>

                        <dt>Manufacturing Date</dt>
                        <dd>
                            ${formatDate(
                                item.manufacturing_date
                            )}
                        </dd>

                        <dt>Expiry Date</dt>
                        <dd>
                            ${formatDate(
                                getExpiryDate(item)
                            )}
                        </dd>

                        <dt>Status</dt>
                        <dd>
                            ${escapeHtml(
                                capitalize(
                                    item.status ||
                                    'active'
                                )
                            )}
                        </dd>

                        <dt>Storage Conditions</dt>
                        <dd>
                            ${escapeHtml(
                                item.storage_conditions ||
                                '—'
                            )}
                        </dd>

                        <dt>Notes</dt>
                        <dd>
                            ${escapeHtml(
                                item.notes ||
                                '—'
                            )}
                        </dd>

                        ${
                            item.created_at
                                ? `
                                    <dt>Created</dt>
                                    <dd>
                                        ${formatDateTime(
                                            item.created_at
                                        )}
                                    </dd>
                                  `
                                : ''
                        }

                        ${
                            item.updated_at
                                ? `
                                    <dt>Updated</dt>
                                    <dd>
                                        ${formatDateTime(
                                            item.updated_at
                                        )}
                                    </dd>
                                  `
                                : ''
                        }

                    </dl>

                </div>
            `;

            return item;
        } catch (error) {
            container.innerHTML = `
                <div
                    class="message message-error">
                    ${escapeHtml(
                        error?.message ||
                        'Unable to load inventory details.'
                    )}
                </div>
            `;

            return null;
        }
    }

    async function loadInventoryIntoForm(
        id,
        formSelector =
            '#editInventoryForm'
    ) {
        const form =
            getElement(
                formSelector
            );

        if (!form) {
            throw new Error(
                'Edit inventory form was not found.'
            );
        }

        const item =
            await get(id);

        const itemId =
            getItemId(item);

        form.dataset.id =
            itemId;

        const fields = {
            id: itemId,
            inventory_id: itemId,
            item_id: itemId,

            item_name:
                item.item_name ??
                item.name ??
                item.product_name ??
                '',

            item_code:
                item.item_code ??
                '',

            item_type:
                item.item_type ??
                '',

            category:
                item.category ??
                '',

            description:
                item.description ??
                '',

            generic_name:
                item.generic_name ??
                '',

            brand_name:
                item.brand_name ??
                '',

            dosage_form:
                item.dosage_form ??
                '',

            strength:
                item.strength ??
                '',

            unit:
                item.unit ??
                '',

            manufacturer:
                item.manufacturer ??
                '',

            supplier_id:
                item.supplier_id ??
                '',

            location_id:
                item.location_id ??
                '',

            batch_number:
                item.batch_number ??
                '',

            manufacturing_date:
                item.manufacturing_date ??
                '',

            expiry_date:
                item.expiry_date ??
                '',

            quantity:
                item.quantity ??
                item.stock_quantity ??
                '',

            reorder_level:
                item.reorder_level ??
                item.minimum_stock ??
                '',

            unit_cost:
                item.unit_cost ??
                '',

            unit_price:
                item.unit_price ??
                '',

            tax_rate:
                item.tax_rate ??
                '',

            status:
                item.status ??
                'active',

            storage_conditions:
                item.storage_conditions ??
                '',

            notes:
                item.notes ??
                ''
        };

        Object.entries(
            fields
        ).forEach(
            ([name, value]) => {
                const field =
                    form.querySelector(
                        `[name="${name}"]`
                    );

                if (!field) {
                    return;
                }

                if (
                    field.type ===
                    'checkbox'
                ) {
                    field.checked =
                        Boolean(value);
                } else {
                    field.value =
                        value ?? '';
                }
            }
        );

        const prescriptionField =
            form.querySelector(
                '[name="prescription_required"]'
            );

        if (prescriptionField) {
            prescriptionField.checked =
                Boolean(
                    item.prescription_required
                );
        }

        return item;
    }

    /* =========================================================
       Event Binding
       ========================================================= */

    function bindForms() {
        const createForms = [
            '#inventoryForm',
            '#createInventoryForm'
        ];

        createForms.forEach(
            selector => {
                const form =
                    getElement(selector);

                if (
                    !form ||
                    form.dataset.inventoryBound ===
                        'true'
                ) {
                    return;
                }

                form.addEventListener(
                    'submit',
                    event => {
                        event.preventDefault();

                        submitCreateForm(
                            form
                        );
                    }
                );

                form.dataset.inventoryBound =
                    'true';
            }
        );

        const editForm =
            getElement(
                '#editInventoryForm'
            );

        if (
            editForm &&
            editForm.dataset.inventoryBound !==
                'true'
        ) {
            editForm.addEventListener(
                'submit',
                event => {
                    event.preventDefault();

                    submitUpdateForm(
                        editForm
                    );
                }
            );

            editForm.dataset.inventoryBound =
                'true';
        }
    }

    function bindSearch() {
        const input =
            getElement(
                '#inventorySearch'
            );

        if (
            input &&
            input.dataset.inventoryBound !==
                'true'
        ) {
            input.addEventListener(
                'keydown',
                event => {
                    if (
                        event.key ===
                        'Enter'
                    ) {
                        event.preventDefault();

                        search(
                            input.value
                        );
                    }
                }
            );

            input.dataset.inventoryBound =
                'true';
        }

        const button =
            getElement(
                '#searchInventory'
            );

        if (
            button &&
            button.dataset.inventoryBound !==
                'true'
        ) {
            button.addEventListener(
                'click',
                () => {
                    search(
                        getValue(
                            '#inventorySearch'
                        )
                    );
                }
            );

            button.dataset.inventoryBound =
                'true';
        }
    }

    function bindFilters() {
        const applyButton =
            getElement(
                '#applyInventoryFilters'
            );

        if (
            applyButton &&
            applyButton.dataset.inventoryBound !==
                'true'
        ) {
            applyButton.addEventListener(
                'click',
                () => {
                    filter({
                        search:
                            getValue(
                                '#inventorySearch'
                            ),

                        category:
                            getValue(
                                '#inventoryCategoryFilter'
                            ),

                        status:
                            getValue(
                                '#inventoryStatusFilter'
                            ),

                        location_id:
                            getValue(
                                '#inventoryLocationFilter'
                            ),

                        supplier_id:
                            getValue(
                                '#inventorySupplierFilter'
                            ),

                        item_type:
                            getValue(
                                '#inventoryTypeFilter'
                            ),

                        low_stock:
                            getElement(
                                '#inventoryLowStockFilter'
                            )?.checked ||
                            false,

                        out_of_stock:
                            getElement(
                                '#inventoryOutOfStockFilter'
                            )?.checked ||
                            false,

                        expiry_from:
                            getValue(
                                '#inventoryExpiryFrom'
                            ),

                        expiry_to:
                            getValue(
                                '#inventoryExpiryTo'
                            )
                    });
                }
            );

            applyButton.dataset.inventoryBound =
                'true';
        }

        const clearButton =
            getElement(
                '#clearInventoryFilters'
            );

        if (
            clearButton &&
            clearButton.dataset.inventoryBound !==
                'true'
        ) {
            clearButton.addEventListener(
                'click',
                () => clearFilters()
            );

            clearButton.dataset.inventoryBound =
                'true';
        }
    }

    function bindPerPage() {
        const select =
            getElement(
                '#inventoryPerPage'
            );

        if (
            !select ||
            select.dataset.inventoryBound ===
                'true'
        ) {
            return;
        }

        select.addEventListener(
            'change',
            () => {
                state.perPage =
                    Number(
                        select.value
                    ) || 10;

                state.currentPage = 1;

                list({
                    page: 1,
                    limit:
                        state.perPage
                });
            }
        );

        select.dataset.inventoryBound =
            'true';
    }

    function bindTableActions() {
        const table =
            getElement(
                '#inventoryTableBody'
            );

        if (
            !table ||
            table.dataset.inventoryBound ===
                'true'
        ) {
            return;
        }

        table.addEventListener(
            'click',
            async event => {
                const button =
                    event.target.closest(
                        '[data-action]'
                    );

                if (!button) {
                    return;
                }

                const action =
                    button.dataset.action;

                const id =
                    button.dataset.id;

                if (!id) {
                    return;
                }

                switch (action) {
                    case 'view-inventory':
                        await showDetails(
                            id
                        );
                        break;

                    case 'edit-inventory':
                        await loadInventoryIntoForm(
                            id
                        );
                        break;

                    case 'delete-inventory':
                        await deleteWithConfirmation(
                            id
                        );
                        break;

                    case 'adjust-stock': {
                        const quantity =
                            window.prompt(
                                'Enter stock quantity:'
                            );

                        if (
                            quantity ===
                            null
                        ) {
                            return;
                        }

                        const type =
                            window.prompt(
                                'Adjustment type (add, remove, set):',
                                'add'
                            );

                        if (
                            type ===
                            null
                        ) {
                            return;
                        }

                        await adjustStockWithConfirmation({
                            id,
                            inventory_id:
                                id,
                            item_id:
                                id,
                            quantity,
                            adjustment_type:
                                type
                        });

                        break;
                    }

                    case 'transfer-inventory': {
                        const quantity =
                            window.prompt(
                                'Enter transfer quantity:'
                            );

                        if (
                            quantity ===
                            null
                        ) {
                            return;
                        }

                        const fromLocation =
                            window.prompt(
                                'Enter source location ID:'
                            );

                        if (
                            fromLocation ===
                            null
                        ) {
                            return;
                        }

                        const toLocation =
                            window.prompt(
                                'Enter destination location ID:'
                            );

                        if (
                            toLocation ===
                            null
                        ) {
                            return;
                        }

                        await transferWithConfirmation({
                            id,
                            inventory_id:
                                id,
                            item_id:
                                id,
                            quantity,
                            from_location_id:
                                fromLocation,
                            to_location_id:
                                toLocation
                        });

                        break;
                    }

                    default:
                        break;
                }
            }
        );

        table.dataset.inventoryBound =
            'true';
    }

    function bindPagination() {
        const container =
            getElement(
                '#inventoryPagination'
            );

        if (
            !container ||
            container.dataset.inventoryBound ===
                'true'
        ) {
            return;
        }

        container.addEventListener(
            'click',
            event => {
                const button =
                    event.target.closest(
                        '[data-page]'
                    );

                if (
                    !button ||
                    button.disabled
                ) {
                    return;
                }

                const page =
                    Number(
                        button.dataset.page
                    );

                if (
                    Number.isFinite(page)
                ) {
                    goToPage(page);
                }
            }
        );

        container.dataset.inventoryBound =
            'true';
    }

    /* =========================================================
       Refresh
       ========================================================= */

    function refreshList() {
        return list({
            page:
                state.currentPage,

            limit:
                state.perPage
        });
    }

    /* =========================================================
       Initialization
       ========================================================= */

    async function init(options = {}) {
        if (options.perPage) {
            state.perPage =
                Number(
                    options.perPage
                ) || 10;
        }

        if (
            options.search !==
            undefined
        ) {
            state.search =
                options.search;
        }

        if (
            options.category !==
            undefined
        ) {
            state.category =
                options.category;
        }

        if (
            options.status !==
            undefined
        ) {
            state.status =
                options.status;
        }

        if (
            options.locationId !==
            undefined
        ) {
            state.locationId =
                options.locationId;
        }

        if (
            options.supplierId !==
            undefined
        ) {
            state.supplierId =
                options.supplierId;
        }

        if (
            options.itemType !==
            undefined
        ) {
            state.itemType =
                options.itemType;
        }

        if (
            options.lowStock !==
            undefined
        ) {
            state.lowStock =
                Boolean(
                    options.lowStock
                );
        }

        if (
            options.outOfStock !==
            undefined
        ) {
            state.outOfStock =
                Boolean(
                    options.outOfStock
                );
        }

        if (
            options.expiryFrom !==
            undefined
        ) {
            state.expiryFrom =
                options.expiryFrom;
        }

        if (
            options.expiryTo !==
            undefined
        ) {
            state.expiryTo =
                options.expiryTo;
        }

        bindForms();
        bindSearch();
        bindFilters();
        bindPerPage();
        bindTableActions();
        bindPagination();

        const hasInventoryUI =
            getElement(
                '#inventoryTableBody'
            ) ||
            getElement(
                '#inventoryForm'
            ) ||
            getElement(
                '#createInventoryForm'
            ) ||
            getElement(
                '#editInventoryForm'
            );

        if (
            hasInventoryUI &&
            options.autoLoad !== false
        ) {
            await list({
                page: 1,
                limit:
                    state.perPage
            });
        }

        return Inventory;
    }

    /* =========================================================
       Public API
       ========================================================= */

    const Inventory = {
        state,
        endpoints,

        list,
        get,
        create,
        update,
        remove,

        adjustStock,
        transfer,

        search,
        filter,
        clearFilters,

        goToPage,
        nextPage,
        previousPage,

        validateInventory,
        normalizeInventoryData,

        formToObject,
        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,
        adjustStockWithConfirmation,
        transferWithConfirmation,

        refreshList,

        renderInventoryTable,
        renderPagination,

        showDetails,
        loadInventoryIntoForm,

        init
    };

    window.Inventory = Inventory;

    document.addEventListener(
        'DOMContentLoaded',
        () => {
            if (
                document.body?.dataset
                    ?.inventoryAutoInit ===
                'false'
            ) {
                return;
            }

            Inventory.init();
        }
    );

})(window);