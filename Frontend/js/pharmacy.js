/**
 * Frontend/js/pharmacy.js
 * Medical Management System
 *
 * Pharmacy operations and UI handling.
 *
 * Expected API endpoints:
 * GET  /pharmacy/list.php
 * GET  /pharmacy/get.php?id=123
 * POST /pharmacy/create.php
 * POST /pharmacy/update.php
 * POST /pharmacy/delete.php
 * POST /pharmacy/dispense.php
 * POST /pharmacy/return.php
 */

(function (window) {
    'use strict';

    if (!window.API) {
        console.error('pharmacy.js requires api.js to be loaded first.');
        return;
    }

    const state = {
        medicines: [],
        currentMedicine: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        category: '',
        status: '',
        dosageForm: '',
        supplierId: '',
        lowStock: false,
        expiryFrom: '',
        expiryTo: '',

        loading: false
    };

    const endpoints = {
        list: '/pharmacy/list.php',
        get: '/pharmacy/get.php',
        create: '/pharmacy/create.php',
        update: '/pharmacy/update.php',
        delete: '/pharmacy/delete.php',
        dispense: '/pharmacy/dispense.php',
        return: '/pharmacy/return.php'
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

    function showMessage(message, type = 'success', selector = '#pharmacyMessage') {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.className = `message message-${type}`;
        element.hidden = !message;
    }

    function clearMessage(selector = '#pharmacyMessage') {
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

    function getMedicineId(medicine) {
        return medicine?.id ??
            medicine?.medicine_id ??
            medicine?.pharmacy_id ??
            '';
    }

    function getMedicineName(medicine) {
        return medicine?.medicine_name ??
            medicine?.name ??
            medicine?.medication_name ??
            medicine?.product_name ??
            '—';
    }

    function getStockQuantity(medicine) {
        const quantity =
            medicine?.stock_quantity ??
            medicine?.quantity ??
            medicine?.stock ??
            0;

        const number = Number(quantity);

        return Number.isFinite(number) ? number : 0;
    }

    function getReorderLevel(medicine) {
        const value =
            medicine?.reorder_level ??
            medicine?.minimum_stock ??
            medicine?.min_stock ??
            0;

        const number = Number(value);

        return Number.isFinite(number) ? number : 0;
    }

    function getExpiryDate(medicine) {
        return medicine?.expiry_date ??
            medicine?.expiration_date ??
            medicine?.expires_at ??
            '';
    }

    function getStatusClass(status) {
        const normalized = String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `status-${normalized}`;
    }

    function isLowStock(medicine) {
        return getStockQuantity(medicine) <= getReorderLevel(medicine);
    }

    function isExpired(medicine) {
        const expiry = getExpiryDate(medicine);

        if (!expiry) {
            return false;
        }

        const expiryDate = new Date(expiry);

        if (Number.isNaN(expiryDate.getTime())) {
            return false;
        }

        return expiryDate < new Date();
    }

    /* =========================================================
       API Helpers
       ========================================================= */

    async function list(options = {}) {
        const params = new URLSearchParams();

        const page = options.page ?? state.currentPage;
        const limit = options.limit ?? state.perPage;

        params.set('page', page);
        params.set('limit', limit);

        if (options.search ?? state.search) {
            params.set('search', options.search ?? state.search);
        }

        if (options.category ?? state.category) {
            params.set('category', options.category ?? state.category);
        }

        if (options.status ?? state.status) {
            params.set('status', options.status ?? state.status);
        }

        if (options.dosage_form ?? state.dosageForm) {
            params.set(
                'dosage_form',
                options.dosage_form ?? state.dosageForm
            );
        }

        if (options.supplier_id ?? state.supplierId) {
            params.set(
                'supplier_id',
                options.supplier_id ?? state.supplierId
            );
        }

        if (options.low_stock ?? state.lowStock) {
            params.set(
                'low_stock',
                options.low_stock ?? state.lowStock ? '1' : '0'
            );
        }

        if (options.expiry_from ?? state.expiryFrom) {
            params.set(
                'expiry_from',
                options.expiry_from ?? state.expiryFrom
            );
        }

        if (options.expiry_to ?? state.expiryTo) {
            params.set(
                'expiry_to',
                options.expiry_to ?? state.expiryTo
            );
        }

        try {
            setLoading(true);

            const query = params.toString();
            const url = query
                ? `${endpoints.list}?${query}`
                : endpoints.list;

            const response = await API.get(url);

            let medicines = [];
            let total = 0;

            if (Array.isArray(response)) {
                medicines = response;
                total = response.length;
            } else if (Array.isArray(response?.data?.medicines)) {
                medicines = response.data.medicines;
                total = Number(
                    response.data.total ??
                    response.total ??
                    medicines.length
                );
            } else if (Array.isArray(response?.medicines)) {
                medicines = response.medicines;
                total = Number(
                    response.total ??
                    medicines.length
                );
            } else if (Array.isArray(response?.data)) {
                medicines = response.data;
                total = Number(
                    response.total ??
                    response.data.total ??
                    medicines.length
                );
            }

            state.medicines = medicines;
            state.currentPage = Number(page) || 1;
            state.perPage = Number(limit) || 10;
            state.total = Number.isFinite(total)
                ? total
                : medicines.length;

            renderMedicineTable(state.medicines);
            renderPagination(
                state.total,
                state.currentPage,
                state.perPage
            );

            return response;
        } catch (error) {
            console.error('Failed to load pharmacy inventory:', error);

            showMessage(
                error?.message || 'Unable to load pharmacy inventory.',
                'error'
            );

            return null;
        } finally {
            setLoading(false);
        }
    }

    async function get(id) {
        if (!id) {
            throw new Error('Medicine ID is required.');
        }

        try {
            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            const medicine =
                response?.data?.medicine ??
                response?.medicine ??
                response?.data ??
                response;

            state.currentMedicine = medicine;

            return medicine;
        } catch (error) {
            console.error('Failed to retrieve medicine:', error);
            throw error;
        }
    }

    async function create(medicineData) {
        const data = normalizeMedicineData(medicineData);
        const validation = validateMedicine(data);

        if (!validation.valid) {
            throw new Error(validation.errors.join(' '));
        }

        try {
            const response = await API.post(
                endpoints.create,
                data
            );

            return response;
        } catch (error) {
            console.error('Failed to create medicine:', error);
            throw error;
        }
    }

    async function update(id, medicineData) {
        if (!id) {
            throw new Error('Medicine ID is required.');
        }

        const data = normalizeMedicineData(medicineData);

        const validation = validateMedicine(data, true);

        if (!validation.valid) {
            throw new Error(validation.errors.join(' '));
        }

        data.id = id;
        data.medicine_id = id;

        try {
            const response = await API.post(
                endpoints.update,
                data
            );

            return response;
        } catch (error) {
            console.error('Failed to update medicine:', error);
            throw error;
        }
    }

    async function remove(id) {
        if (!id) {
            throw new Error('Medicine ID is required.');
        }

        try {
            return await API.post(
                endpoints.delete,
                {
                    id,
                    medicine_id: id
                }
            );
        } catch (error) {
            console.error('Failed to delete medicine:', error);
            throw error;
        }
    }

    async function dispense(data) {
        const payload = {
            id: data?.id ?? data?.medicine_id ?? '',
            medicine_id: data?.medicine_id ?? data?.id ?? '',
            prescription_id: data?.prescription_id ?? '',
            patient_id: data?.patient_id ?? '',
            quantity: data?.quantity ?? '',
            dispensed_by: data?.dispensed_by ?? '',
            notes: data?.notes ?? ''
        };

        if (!payload.id) {
            throw new Error('Medicine ID is required.');
        }

        if (!payload.quantity || Number(payload.quantity) <= 0) {
            throw new Error('A valid dispensing quantity is required.');
        }

        try {
            return await API.post(
                endpoints.dispense,
                payload
            );
        } catch (error) {
            console.error('Failed to dispense medicine:', error);
            throw error;
        }
    }

    async function returnMedicine(data) {
        const payload = {
            id: data?.id ?? data?.medicine_id ?? '',
            medicine_id: data?.medicine_id ?? data?.id ?? '',
            prescription_id: data?.prescription_id ?? '',
            patient_id: data?.patient_id ?? '',
            quantity: data?.quantity ?? '',
            returned_by: data?.returned_by ?? '',
            reason: data?.reason ?? '',
            notes: data?.notes ?? ''
        };

        if (!payload.id) {
            throw new Error('Medicine ID is required.');
        }

        if (!payload.quantity || Number(payload.quantity) <= 0) {
            throw new Error('A valid return quantity is required.');
        }

        try {
            return await API.post(
                endpoints.return,
                payload
            );
        } catch (error) {
            console.error('Failed to return medicine:', error);
            throw error;
        }
    }

    /* =========================================================
       Search / Filtering
       ========================================================= */

    async function search(term) {
        state.search = String(term || '').trim();
        state.currentPage = 1;

        return list({
            page: 1,
            search: state.search
        });
    }

    async function filter(filters = {}) {
        state.search = filters.search ?? state.search;
        state.category = filters.category ?? '';
        state.status = filters.status ?? '';
        state.dosageForm = filters.dosage_form ?? filters.dosageForm ?? '';
        state.supplierId = filters.supplier_id ?? filters.supplierId ?? '';
        state.lowStock = Boolean(
            filters.low_stock ??
            filters.lowStock ??
            false
        );
        state.expiryFrom = filters.expiry_from ?? filters.expiryFrom ?? '';
        state.expiryTo = filters.expiry_to ?? filters.expiryTo ?? '';
        state.currentPage = 1;

        return list({
            page: 1,
            search: state.search,
            category: state.category,
            status: state.status,
            dosage_form: state.dosageForm,
            supplier_id: state.supplierId,
            low_stock: state.lowStock,
            expiry_from: state.expiryFrom,
            expiry_to: state.expiryTo
        });
    }

    function clearFilters() {
        state.search = '';
        state.category = '';
        state.status = '';
        state.dosageForm = '';
        state.supplierId = '';
        state.lowStock = false;
        state.expiryFrom = '';
        state.expiryTo = '';
        state.currentPage = 1;

        const selectors = [
            '#pharmacySearch',
            '#pharmacyCategoryFilter',
            '#pharmacyStatusFilter',
            '#pharmacyDosageFormFilter',
            '#pharmacySupplierFilter',
            '#pharmacyExpiryFrom',
            '#pharmacyExpiryTo'
        ];

        selectors.forEach(selector => {
            const element = getElement(selector);

            if (element) {
                element.value = '';
            }
        });

        const lowStock = getElement('#pharmacyLowStockFilter');

        if (lowStock) {
            lowStock.checked = false;
        }

        return list({
            page: 1,
            search: '',
            category: '',
            status: '',
            dosage_form: '',
            supplier_id: '',
            low_stock: false,
            expiry_from: '',
            expiry_to: ''
        });
    }

    /* =========================================================
       Pagination
       ========================================================= */

    function goToPage(page) {
        const totalPages = Math.max(
            1,
            Math.ceil(state.total / state.perPage)
        );

        const targetPage = Math.max(
            1,
            Math.min(Number(page) || 1, totalPages)
        );

        state.currentPage = targetPage;

        return list({
            page: targetPage,
            limit: state.perPage
        });
    }

    function nextPage() {
        const totalPages = Math.ceil(
            state.total / state.perPage
        );

        if (state.currentPage >= totalPages) {
            return Promise.resolve(null);
        }

        return goToPage(state.currentPage + 1);
    }

    function previousPage() {
        if (state.currentPage <= 1) {
            return Promise.resolve(null);
        }

        return goToPage(state.currentPage - 1);
    }

    /* =========================================================
       Validation / Normalization
       ========================================================= */

    function validateMedicine(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.medicine_name) {
            errors.push('Medicine name is required.');
        }

        if (
            data.stock_quantity !== '' &&
            data.stock_quantity !== null &&
            data.stock_quantity !== undefined
        ) {
            const stock = Number(data.stock_quantity);

            if (!Number.isFinite(stock) || stock < 0) {
                errors.push('Stock quantity must be zero or greater.');
            }
        }

        if (
            data.reorder_level !== '' &&
            data.reorder_level !== null &&
            data.reorder_level !== undefined
        ) {
            const reorderLevel = Number(data.reorder_level);

            if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
                errors.push('Reorder level must be zero or greater.');
            }
        }

        if (
            data.unit_price !== '' &&
            data.unit_price !== null &&
            data.unit_price !== undefined
        ) {
            const price = Number(data.unit_price);

            if (!Number.isFinite(price) || price < 0) {
                errors.push('Unit price must be zero or greater.');
            }
        }

        if (
            data.expiry_date &&
            Number.isNaN(new Date(data.expiry_date).getTime())
        ) {
            errors.push('Expiry date is invalid.');
        }

        if (
            data.manufacturing_date &&
            Number.isNaN(
                new Date(data.manufacturing_date).getTime()
            )
        ) {
            errors.push('Manufacturing date is invalid.');
        }

        if (
            data.supplier_id &&
            !/^\d+$/.test(String(data.supplier_id))
        ) {
            errors.push('Supplier ID must be numeric.');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    function normalizeMedicineData(data = {}) {
        return {
            medicine_name:
                data.medicine_name ??
                data.name ??
                data.medication_name ??
                data.product_name ??
                '',

            generic_name: data.generic_name ?? '',
            brand_name: data.brand_name ?? '',
            category: data.category ?? '',
            dosage_form:
                data.dosage_form ??
                data.form ??
                '',

            strength: data.strength ?? '',
            unit: data.unit ?? '',

            manufacturer: data.manufacturer ?? '',

            supplier_id:
                data.supplier_id !== undefined
                    ? data.supplier_id
                    : '',

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

            stock_quantity:
                data.stock_quantity ??
                data.quantity ??
                data.stock ??
                '',

            reorder_level:
                data.reorder_level ??
                data.minimum_stock ??
                data.min_stock ??
                '',

            unit_price:
                data.unit_price ??
                data.price ??
                '',

            selling_price:
                data.selling_price ??
                '',

            tax_rate:
                data.tax_rate ??
                '',

            status:
                data.status ??
                'active',

            prescription_required:
                data.prescription_required ??
                data.requires_prescription ??
                false,

            storage_conditions:
                data.storage_conditions ??
                '',

            description:
                data.description ??
                '',

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

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            if (data[key] !== undefined) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }

                data[key].push(value);
            } else {
                data[key] = value;
            }
        });

        form.querySelectorAll(
            'input[type="checkbox"][name]'
        ).forEach(input => {
            data[input.name] = input.checked;
        });

        return data;
    }

    async function submitCreateForm(form) {
        const targetForm =
            typeof form === 'string'
                ? getElement(form)
                : form;

        if (!targetForm) {
            throw new Error('Create medicine form was not found.');
        }

        const button = targetForm.querySelector(
            '[type="submit"]'
        );

        clearMessage();

        try {
            setLoading(true, button);

            const data = formToObject(targetForm);

            await create(data);

            showMessage(
                'Medicine created successfully.',
                'success'
            );

            targetForm.reset();

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to create medicine.',
                'error'
            );

            return false;
        } finally {
            setLoading(false, button);
        }
    }

    async function submitUpdateForm(form) {
        const targetForm =
            typeof form === 'string'
                ? getElement(form)
                : form;

        if (!targetForm) {
            throw new Error('Edit medicine form was not found.');
        }

        const id =
            targetForm.dataset.id ||
            targetForm.querySelector('[name="id"]')?.value ||
            targetForm.querySelector('[name="medicine_id"]')?.value;

        if (!id) {
            showMessage(
                'Medicine ID is required.',
                'error'
            );

            return false;
        }

        const button = targetForm.querySelector(
            '[type="submit"]'
        );

        clearMessage();

        try {
            setLoading(true, button);

            const data = formToObject(targetForm);

            await update(id, data);

            showMessage(
                'Medicine updated successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to update medicine.',
                'error'
            );

            return false;
        } finally {
            setLoading(false, button);
        }
    }

    /* =========================================================
       Confirmation Actions
       ========================================================= */

    async function deleteWithConfirmation(id) {
        if (!id) {
            return false;
        }

        const confirmed = window.confirm(
            'Are you sure you want to delete this medicine?'
        );

        if (!confirmed) {
            return false;
        }

        try {
            await remove(id);

            showMessage(
                'Medicine deleted successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to delete medicine.',
                'error'
            );

            return false;
        }
    }

    async function dispenseWithConfirmation(data) {
        const quantity = Number(data?.quantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            showMessage(
                'Enter a valid dispensing quantity.',
                'error'
            );

            return false;
        }

        const confirmed = window.confirm(
            `Dispense ${quantity} unit(s) of this medicine?`
        );

        if (!confirmed) {
            return false;
        }

        try {
            await dispense(data);

            showMessage(
                'Medicine dispensed successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to dispense medicine.',
                'error'
            );

            return false;
        }
    }

    async function returnWithConfirmation(data) {
        const quantity = Number(data?.quantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            showMessage(
                'Enter a valid return quantity.',
                'error'
            );

            return false;
        }

        const confirmed = window.confirm(
            `Return ${quantity} unit(s) to pharmacy stock?`
        );

        if (!confirmed) {
            return false;
        }

        try {
            await returnMedicine(data);

            showMessage(
                'Medicine returned successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to process medicine return.',
                'error'
            );

            return false;
        }
    }

    /* =========================================================
       Rendering
       ========================================================= */

    function renderMedicineTable(
        medicines = state.medicines,
        selector = '#pharmacyTableBody'
    ) {
        const tbody = getElement(selector);

        if (!tbody) {
            return;
        }

        if (!Array.isArray(medicines) || medicines.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state">
                        No pharmacy records found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = medicines.map(medicine => {
            const id = getMedicineId(medicine);
            const name = getMedicineName(medicine);
            const stock = getStockQuantity(medicine);
            const reorderLevel = getReorderLevel(medicine);
            const expiryDate = getExpiryDate(medicine);

            const lowStock = isLowStock(medicine);
            const expired = isExpired(medicine);

            let stockClass = '';

            if (expired) {
                stockClass = 'stock-expired';
            } else if (lowStock) {
                stockClass = 'stock-low';
            } else {
                stockClass = 'stock-ok';
            }

            return `
                <tr data-id="${escapeHtml(id)}">
                    <td>${escapeHtml(id)}</td>

                    <td>
                        <strong>
                            ${escapeHtml(name)}
                        </strong>

                        ${
                            medicine.generic_name
                                ? `<small>
                                    ${escapeHtml(
                                        medicine.generic_name
                                    )}
                                   </small>`
                                : ''
                        }
                    </td>

                    <td>
                        ${escapeHtml(
                            medicine.category || '—'
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            medicine.dosage_form || '—'
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            medicine.strength || '—'
                        )}
                    </td>

                    <td>
                        <span class="${stockClass}">
                            ${escapeHtml(stock)}
                        </span>

                        ${
                            reorderLevel
                                ? `<small>
                                    / ${escapeHtml(
                                        reorderLevel
                                    )} min
                                   </small>`
                                : ''
                        }
                    </td>

                    <td>
                        ${formatCurrency(
                            medicine.unit_price
                        )}
                    </td>

                    <td>
                        ${formatDate(expiryDate)}
                    </td>

                    <td>
                        <span class="status-badge ${getStatusClass(
                            medicine.status
                        )}">
                            ${escapeHtml(
                                capitalize(
                                    medicine.status || 'active'
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        ${
                            medicine.prescription_required
                                ? '<span title="Prescription required">Yes</span>'
                                : 'No'
                        }
                    </td>

                    <td>
                        ${
                            lowStock
                                ? '<span class="badge badge-warning">Low Stock</span>'
                                : ''
                        }

                        ${
                            expired
                                ? '<span class="badge badge-danger">Expired</span>'
                                : ''
                        }
                    </td>

                    <td class="actions">
                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="view-medicine"
                            data-id="${escapeHtml(id)}">
                            View
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="edit-medicine"
                            data-id="${escapeHtml(id)}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm"
                            data-action="dispense-medicine"
                            data-id="${escapeHtml(id)}">
                            Dispense
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-danger"
                            data-action="delete-medicine"
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
        selector = '#pharmacyPagination'
    ) {
        const container = getElement(selector);

        if (!container) {
            return;
        }

        const totalPages = Math.max(
            1,
            Math.ceil(Number(total) / Number(limit))
        );

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button
                type="button"
                data-page="${Math.max(1, page - 1)}"
                ${page <= 1 ? 'disabled' : ''}>
                Previous
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                Math.abs(i - page) <= 2
            ) {
                html += `
                    <button
                        type="button"
                        data-page="${i}"
                        class="${i === page ? 'active' : ''}">
                        ${i}
                    </button>
                `;
            } else if (
                i === page - 3 ||
                i === page + 3
            ) {
                html += '<span class="pagination-ellipsis">…</span>';
            }
        }

        html += `
            <button
                type="button"
                data-page="${Math.min(totalPages, page + 1)}"
                ${page >= totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;

        container.innerHTML = html;
    }

    async function showDetails(
        id,
        containerSelector = '#pharmacyDetails'
    ) {
        const container = getElement(containerSelector);

        if (!container) {
            return null;
        }

        try {
            const medicine = await get(id);

            const stock = getStockQuantity(medicine);
            const reorderLevel = getReorderLevel(medicine);
            const expiryDate = getExpiryDate(medicine);

            container.innerHTML = `
                <div class="pharmacy-details">

                    <h3>
                        ${escapeHtml(
                            getMedicineName(medicine)
                        )}
                    </h3>

                    <dl>

                        <dt>Medicine ID</dt>
                        <dd>
                            ${escapeHtml(
                                getMedicineId(medicine)
                            )}
                        </dd>

                        <dt>Generic Name</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.generic_name || '—'
                            )}
                        </dd>

                        <dt>Brand Name</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.brand_name || '—'
                            )}
                        </dd>

                        <dt>Category</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.category || '—'
                            )}
                        </dd>

                        <dt>Dosage Form</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.dosage_form || '—'
                            )}
                        </dd>

                        <dt>Strength</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.strength || '—'
                            )}
                        </dd>

                        <dt>Manufacturer</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.manufacturer || '—'
                            )}
                        </dd>

                        <dt>Batch Number</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.batch_number || '—'
                            )}
                        </dd>

                        <dt>Stock Quantity</dt>
                        <dd>
                            ${escapeHtml(stock)}
                        </dd>

                        <dt>Reorder Level</dt>
                        <dd>
                            ${escapeHtml(reorderLevel)}
                        </dd>

                        <dt>Unit Price</dt>
                        <dd>
                            ${formatCurrency(
                                medicine.unit_price
                            )}
                        </dd>

                        <dt>Selling Price</dt>
                        <dd>
                            ${formatCurrency(
                                medicine.selling_price
                            )}
                        </dd>

                        <dt>Manufacturing Date</dt>
                        <dd>
                            ${formatDate(
                                medicine.manufacturing_date
                            )}
                        </dd>

                        <dt>Expiry Date</dt>
                        <dd>
                            ${formatDate(expiryDate)}
                        </dd>

                        <dt>Status</dt>
                        <dd>
                            ${escapeHtml(
                                capitalize(
                                    medicine.status || 'active'
                                )
                            )}
                        </dd>

                        <dt>Prescription Required</dt>
                        <dd>
                            ${
                                medicine.prescription_required
                                    ? 'Yes'
                                    : 'No'
                            }
                        </dd>

                        <dt>Storage Conditions</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.storage_conditions || '—'
                            )}
                        </dd>

                        <dt>Description</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.description || '—'
                            )}
                        </dd>

                        <dt>Notes</dt>
                        <dd>
                            ${escapeHtml(
                                medicine.notes || '—'
                            )}
                        </dd>

                        ${
                            medicine.created_at
                                ? `
                                    <dt>Created</dt>
                                    <dd>
                                        ${formatDateTime(
                                            medicine.created_at
                                        )}
                                    </dd>
                                  `
                                : ''
                        }

                        ${
                            medicine.updated_at
                                ? `
                                    <dt>Updated</dt>
                                    <dd>
                                        ${formatDateTime(
                                            medicine.updated_at
                                        )}
                                    </dd>
                                  `
                                : ''
                        }

                    </dl>
                </div>
            `;

            return medicine;
        } catch (error) {
            container.innerHTML = `
                <div class="message message-error">
                    ${escapeHtml(
                        error?.message ||
                        'Unable to load medicine details.'
                    )}
                </div>
            `;

            return null;
        }
    }

    async function loadMedicineIntoForm(
        id,
        formSelector = '#editPharmacyForm'
    ) {
        const form = getElement(formSelector);

        if (!form) {
            throw new Error('Edit pharmacy form was not found.');
        }

        const medicine = await get(id);

        form.dataset.id = getMedicineId(medicine);

        const fields = {
            id: getMedicineId(medicine),
            medicine_id: getMedicineId(medicine),
            medicine_name: medicine.medicine_name ??
                medicine.name ??
                '',
            generic_name: medicine.generic_name ?? '',
            brand_name: medicine.brand_name ?? '',
            category: medicine.category ?? '',
            dosage_form: medicine.dosage_form ?? '',
            strength: medicine.strength ?? '',
            unit: medicine.unit ?? '',
            manufacturer: medicine.manufacturer ?? '',
            supplier_id: medicine.supplier_id ?? '',
            batch_number: medicine.batch_number ?? '',
            manufacturing_date:
                medicine.manufacturing_date ?? '',
            expiry_date: medicine.expiry_date ?? '',
            stock_quantity:
                medicine.stock_quantity ??
                medicine.quantity ??
                '',
            reorder_level:
                medicine.reorder_level ??
                medicine.minimum_stock ??
                '',
            unit_price: medicine.unit_price ?? '',
            selling_price: medicine.selling_price ?? '',
            tax_rate: medicine.tax_rate ?? '',
            status: medicine.status ?? 'active',
            storage_conditions:
                medicine.storage_conditions ?? '',
            description: medicine.description ?? '',
            notes: medicine.notes ?? ''
        };

        Object.entries(fields).forEach(([name, value]) => {
            const field = form.querySelector(
                `[name="${name}"]`
            );

            if (!field) {
                return;
            }

            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = value ?? '';
            }
        });

        const prescriptionField = form.querySelector(
            '[name="prescription_required"]'
        );

        if (prescriptionField) {
            prescriptionField.checked = Boolean(
                medicine.prescription_required
            );
        }

        return medicine;
    }

    /* =========================================================
       Event Handlers
       ========================================================= */

    function bindForms() {
        const createForms = [
            '#pharmacyForm',
            '#createPharmacyForm'
        ];

        createForms.forEach(selector => {
            const form = getElement(selector);

            if (!form || form.dataset.pharmacyBound === 'true') {
                return;
            }

            form.addEventListener('submit', event => {
                event.preventDefault();
                submitCreateForm(form);
            });

            form.dataset.pharmacyBound = 'true';
        });

        const editForm = getElement(
            '#editPharmacyForm'
        );

        if (
            editForm &&
            editForm.dataset.pharmacyBound !== 'true'
        ) {
            editForm.addEventListener(
                'submit',
                event => {
                    event.preventDefault();
                    submitUpdateForm(editForm);
                }
            );

            editForm.dataset.pharmacyBound = 'true';
        }
    }

    function bindSearch() {
        const searchInput = getElement(
            '#pharmacySearch'
        );

        if (
            searchInput &&
            searchInput.dataset.pharmacyBound !== 'true'
        ) {
            searchInput.addEventListener(
                'keydown',
                event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        search(searchInput.value);
                    }
                }
            );

            searchInput.dataset.pharmacyBound = 'true';
        }

        const searchButton = getElement(
            '#searchPharmacy'
        );

        if (
            searchButton &&
            searchButton.dataset.pharmacyBound !== 'true'
        ) {
            searchButton.addEventListener(
                'click',
                () => {
                    search(
                        getValue('#pharmacySearch')
                    );
                }
            );

            searchButton.dataset.pharmacyBound = 'true';
        }
    }

    function bindFilters() {
        const applyButton = getElement(
            '#applyPharmacyFilters'
        );

        if (
            applyButton &&
            applyButton.dataset.pharmacyBound !== 'true'
        ) {
            applyButton.addEventListener(
                'click',
                () => {
                    filter({
                        search: getValue(
                            '#pharmacySearch'
                        ),

                        category: getValue(
                            '#pharmacyCategoryFilter'
                        ),

                        status: getValue(
                            '#pharmacyStatusFilter'
                        ),

                        dosage_form: getValue(
                            '#pharmacyDosageFormFilter'
                        ),

                        supplier_id: getValue(
                            '#pharmacySupplierFilter'
                        ),

                        low_stock:
                            getElement(
                                '#pharmacyLowStockFilter'
                            )?.checked || false,

                        expiry_from: getValue(
                            '#pharmacyExpiryFrom'
                        ),

                        expiry_to: getValue(
                            '#pharmacyExpiryTo'
                        )
                    });
                }
            );

            applyButton.dataset.pharmacyBound = 'true';
        }

        const clearButton = getElement(
            '#clearPharmacyFilters'
        );

        if (
            clearButton &&
            clearButton.dataset.pharmacyBound !== 'true'
        ) {
            clearButton.addEventListener(
                'click',
                () => clearFilters()
            );

            clearButton.dataset.pharmacyBound = 'true';
        }
    }

    function bindPerPage() {
        const select = getElement(
            '#pharmacyPerPage'
        );

        if (
            !select ||
            select.dataset.pharmacyBound === 'true'
        ) {
            return;
        }

        select.addEventListener(
            'change',
            () => {
                state.perPage =
                    Number(select.value) || 10;

                state.currentPage = 1;

                list({
                    page: 1,
                    limit: state.perPage
                });
            }
        );

        select.dataset.pharmacyBound = 'true';
    }

    function bindTableActions() {
        const table = getElement(
            '#pharmacyTableBody'
        );

        if (
            !table ||
            table.dataset.pharmacyBound === 'true'
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
                    case 'view-medicine':
                        await showDetails(id);
                        break;

                    case 'edit-medicine':
                        await loadMedicineIntoForm(id);
                        break;

                    case 'delete-medicine':
                        await deleteWithConfirmation(id);
                        break;

                    case 'dispense-medicine': {
                        const quantity =
                            window.prompt(
                                'Enter quantity to dispense:'
                            );

                        if (quantity === null) {
                            return;
                        }

                        await dispenseWithConfirmation({
                            id,
                            medicine_id: id,
                            quantity
                        });

                        break;
                    }

                    default:
                        break;
                }
            }
        );

        table.dataset.pharmacyBound = 'true';
    }

    function bindPagination() {
        const container = getElement(
            '#pharmacyPagination'
        );

        if (
            !container ||
            container.dataset.pharmacyBound === 'true'
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

                if (!button || button.disabled) {
                    return;
                }

                const page =
                    Number(button.dataset.page);

                if (Number.isFinite(page)) {
                    goToPage(page);
                }
            }
        );

        container.dataset.pharmacyBound = 'true';
    }

    /* =========================================================
       Refresh
       ========================================================= */

    function refreshList() {
        return list({
            page: state.currentPage,
            limit: state.perPage
        });
    }

    /* =========================================================
       Initialization
       ========================================================= */

    async function init(options = {}) {
        if (options.perPage) {
            state.perPage =
                Number(options.perPage) || 10;
        }

        if (options.search !== undefined) {
            state.search = options.search;
        }

        if (options.category !== undefined) {
            state.category = options.category;
        }

        if (options.status !== undefined) {
            state.status = options.status;
        }

        if (options.dosageForm !== undefined) {
            state.dosageForm = options.dosageForm;
        }

        if (options.supplierId !== undefined) {
            state.supplierId = options.supplierId;
        }

        if (options.lowStock !== undefined) {
            state.lowStock = Boolean(options.lowStock);
        }

        if (options.expiryFrom !== undefined) {
            state.expiryFrom = options.expiryFrom;
        }

        if (options.expiryTo !== undefined) {
            state.expiryTo = options.expiryTo;
        }

        bindForms();
        bindSearch();
        bindFilters();
        bindPerPage();
        bindTableActions();
        bindPagination();

        const hasPharmacyUI =
            getElement('#pharmacyTableBody') ||
            getElement('#pharmacyForm') ||
            getElement('#createPharmacyForm') ||
            getElement('#editPharmacyForm');

        if (hasPharmacyUI && options.autoLoad !== false) {
            await list({
                page: 1,
                limit: state.perPage
            });
        }

        return Pharmacy;
    }

    /* =========================================================
       Public API
       ========================================================= */

    const Pharmacy = {
        state,
        endpoints,

        list,
        get,
        create,
        update,
        remove,

        dispense,
        returnMedicine,

        search,
        filter,
        clearFilters,

        goToPage,
        nextPage,
        previousPage,

        validateMedicine,
        normalizeMedicineData,

        formToObject,
        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,
        dispenseWithConfirmation,
        returnWithConfirmation,

        refreshList,

        renderMedicineTable,
        renderPagination,

        showDetails,
        loadMedicineIntoForm,

        init
    };

    window.Pharmacy = Pharmacy;

    document.addEventListener(
        'DOMContentLoaded',
        () => {
            if (
                document.body?.dataset?.pharmacyAutoInit ===
                'false'
            ) {
                return;
            }

            Pharmacy.init();
        }
    );

})(window);
#pharmacyTableBody
#pharmacyPagination
#pharmacySearch
#searchPharmacy

#applyPharmacyFilters
#clearPharmacyFilters

#pharmacyCategoryFilter
#pharmacyStatusFilter
#pharmacyDosageFormFilter
#pharmacySupplierFilter
#pharmacyLowStockFilter
#pharmacyExpiryFrom
#pharmacyExpiryTo
#pharmacyPerPage

#pharmacyMessage
#pharmacyDetails

#pharmacyForm
#createPharmacyForm
#editPharmacyForm
