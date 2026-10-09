/**
 * Frontend/js/labboratory.js
 * Medical Management System
 *
 * Laboratory test operations and UI handling.
 *
 * Note:
 * The filename follows the requested project name:
 *     labboratory.js
 *
 * Expected API endpoints:
 * GET  /laboratory/list.php
 * GET  /laboratory/get.php?id=123
 * POST /laboratory/create.php
 * POST /laboratory/update.php
 * POST /laboratory/delete.php
 * POST /laboratory/collect.php
 * POST /laboratory/process.php
 * POST /laboratory/complete.php
 * POST /laboratory/cancel.php
 */

(function (window) {
    'use strict';

    if (!window.API) {
        console.error(
            'labboratory.js requires api.js to be loaded first.'
        );
        return;
    }

    const state = {
        tests: [],
        currentTest: null,

        currentPage: 1,
        perPage: 10,
        total: 0,

        search: '',
        patientId: '',
        doctorId: '',
        appointmentId: '',
        medicalRecordId: '',
        testType: '',
        category: '',
        status: '',
        priority: '',
        dateFrom: '',
        dateTo: '',

        loading: false
    };

    const endpoints = {
        list: '/laboratory/list.php',
        get: '/laboratory/get.php',
        create: '/laboratory/create.php',
        update: '/laboratory/update.php',
        delete: '/laboratory/delete.php',
        collect: '/laboratory/collect.php',
        process: '/laboratory/process.php',
        complete: '/laboratory/complete.php',
        cancel: '/laboratory/cancel.php'
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
        selector = '#laboratoryMessage'
    ) {
        const element = getElement(selector);

        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.className = `message message-${type}`;
        element.hidden = !message;
    }

    function clearMessage(
        selector = '#laboratoryMessage'
    ) {
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
            button.dataset.originalText =
                button.textContent;

            button.textContent = 'Processing...';
        } else if (button.dataset.originalText) {
            button.textContent =
                button.dataset.originalText;

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

    function getTestId(test) {
        return test?.id ??
            test?.laboratory_id ??
            test?.lab_test_id ??
            test?.test_id ??
            '';
    }

    function getPatientName(test) {
        if (test?.patient_name) {
            return test.patient_name;
        }

        if (test?.patient) {
            if (typeof test.patient === 'string') {
                return test.patient;
            }

            return [
                test.patient.first_name,
                test.patient.middle_name,
                test.patient.last_name
            ]
                .filter(Boolean)
                .join(' ');
        }

        return '—';
    }

    function getDoctorName(test) {
        if (test?.doctor_name) {
            return test.doctor_name;
        }

        if (test?.doctor) {
            if (typeof test.doctor === 'string') {
                return test.doctor;
            }

            return [
                test.doctor.first_name,
                test.doctor.middle_name,
                test.doctor.last_name
            ]
                .filter(Boolean)
                .join(' ');
        }

        return '—';
    }

    function getTestName(test) {
        return test?.test_name ??
            test?.laboratory_test_name ??
            test?.name ??
            test?.test_type ??
            '—';
    }

    function getStatusClass(status) {
        const normalized = String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `status-${normalized}`;
    }

    function getPriorityClass(priority) {
        const normalized = String(priority || '')
            .toLowerCase()
            .replace(/\s+/g, '-');

        return `priority-${normalized}`;
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

        const patientId =
            options.patient_id ??
            state.patientId;

        const doctorId =
            options.doctor_id ??
            state.doctorId;

        const appointmentId =
            options.appointment_id ??
            state.appointmentId;

        const medicalRecordId =
            options.medical_record_id ??
            state.medicalRecordId;

        const testType =
            options.test_type ??
            state.testType;

        const category =
            options.category ??
            state.category;

        const status =
            options.status ??
            state.status;

        const priority =
            options.priority ??
            state.priority;

        const dateFrom =
            options.date_from ??
            state.dateFrom;

        const dateTo =
            options.date_to ??
            state.dateTo;

        if (search) {
            params.set('search', search);
        }

        if (patientId) {
            params.set('patient_id', patientId);
        }

        if (doctorId) {
            params.set('doctor_id', doctorId);
        }

        if (appointmentId) {
            params.set(
                'appointment_id',
                appointmentId
            );
        }

        if (medicalRecordId) {
            params.set(
                'medical_record_id',
                medicalRecordId
            );
        }

        if (testType) {
            params.set('test_type', testType);
        }

        if (category) {
            params.set('category', category);
        }

        if (status) {
            params.set('status', status);
        }

        if (priority) {
            params.set('priority', priority);
        }

        if (dateFrom) {
            params.set('date_from', dateFrom);
        }

        if (dateTo) {
            params.set('date_to', dateTo);
        }

        try {
            setLoading(true);

            const query = params.toString();

            const url = query
                ? `${endpoints.list}?${query}`
                : endpoints.list;

            const response = await API.get(url);

            let tests = [];
            let total = 0;

            if (Array.isArray(response)) {
                tests = response;
                total = response.length;
            } else if (
                Array.isArray(response?.data?.tests)
            ) {
                tests = response.data.tests;

                total = Number(
                    response.data.total ??
                    response.total ??
                    tests.length
                );
            } else if (
                Array.isArray(response?.data?.laboratory)
            ) {
                tests = response.data.laboratory;

                total = Number(
                    response.data.total ??
                    response.total ??
                    tests.length
                );
            } else if (
                Array.isArray(response?.tests)
            ) {
                tests = response.tests;

                total = Number(
                    response.total ??
                    tests.length
                );
            } else if (
                Array.isArray(response?.laboratory)
            ) {
                tests = response.laboratory;

                total = Number(
                    response.total ??
                    tests.length
                );
            } else if (
                Array.isArray(response?.data)
            ) {
                tests = response.data;

                total = Number(
                    response.total ??
                    tests.length
                );
            }

            state.tests = tests;
            state.currentPage =
                Number(page) || 1;

            state.perPage =
                Number(limit) || 10;

            state.total =
                Number.isFinite(total)
                    ? total
                    : tests.length;

            renderTestTable(state.tests);

            renderPagination(
                state.total,
                state.currentPage,
                state.perPage
            );

            return response;
        } catch (error) {
            console.error(
                'Failed to load laboratory tests:',
                error
            );

            showMessage(
                error?.message ||
                'Unable to load laboratory tests.',
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
                'Laboratory test ID is required.'
            );
        }

        try {
            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            const test =
                response?.data?.test ??
                response?.data?.laboratory ??
                response?.test ??
                response?.laboratory ??
                response?.data ??
                response;

            state.currentTest = test;

            return test;
        } catch (error) {
            console.error(
                'Failed to retrieve laboratory test:',
                error
            );

            throw error;
        }
    }

    async function create(testData) {
        const data =
            normalizeTestData(testData);

        const validation =
            validateTest(data);

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
                'Failed to create laboratory test:',
                error
            );

            throw error;
        }
    }

    async function update(id, testData) {
        if (!id) {
            throw new Error(
                'Laboratory test ID is required.'
            );
        }

        const data =
            normalizeTestData(testData);

        const validation =
            validateTest(
                data,
                true
            );

        if (!validation.valid) {
            throw new Error(
                validation.errors.join(' ')
            );
        }

        data.id = id;
        data.laboratory_id = id;
        data.lab_test_id = id;
        data.test_id = id;

        try {
            return await API.post(
                endpoints.update,
                data
            );
        } catch (error) {
            console.error(
                'Failed to update laboratory test:',
                error
            );

            throw error;
        }
    }

    async function remove(id) {
        if (!id) {
            throw new Error(
                'Laboratory test ID is required.'
            );
        }

        try {
            return await API.post(
                endpoints.delete,
                {
                    id,
                    laboratory_id: id,
                    lab_test_id: id,
                    test_id: id
                }
            );
        } catch (error) {
            console.error(
                'Failed to delete laboratory test:',
                error
            );

            throw error;
        }
    }

    async function collect(data = {}) {
        const id =
            data.id ??
            data.laboratory_id ??
            data.lab_test_id ??
            data.test_id ??
            '';

        if (!id) {
            throw new Error(
                'Laboratory test ID is required.'
            );
        }

        const payload = {
            id,
            laboratory_id: id,
            lab_test_id: id,
            test_id: id,

            collected_by:
                data.collected_by ??
                '',

            collection_date:
                data.collection_date ??
                '',

            specimen_type:
                data.specimen_type ??
                '',

            specimen_number:
                data.specimen_number ??
                '',

            notes:
                data.notes ??
                ''
        };

        try {
            return await API.post(
                endpoints.collect,
                payload
            );
        } catch (error) {
            console.error(
                'Failed to collect laboratory specimen:',
                error
            );

            throw error;
        }
    }

    async function process(data = {}) {
        const id =
            data.id ??
            data.laboratory_id ??
            data.lab_test_id ??
            data.test_id ??
            '';

        if (!id) {
            throw new Error(
                'Laboratory test ID is required.'
            );
        }

        const payload = {
            id,
            laboratory_id: id,
            lab_test_id: id,
            test_id: id,

            processed_by:
                data.processed_by ??
                '',

            processing_date:
                data.processing_date ??
                '',

            notes:
                data.notes ??
                ''
        };

        try {
            return await API.post(
                endpoints.process,
                payload
            );
        } catch (error) {
            console.error(
                'Failed to process laboratory test:',
                error
            );

            throw error;
        }
    }

    async function complete(data = {}) {
        const id =
            data.id ??
            data.laboratory_id ??
            data.lab_test_id ??
            data.test_id ??
            '';

        if (!id) {
            throw new Error(
                'Laboratory test ID is required.'
            );
        }

        const payload = {
            id,
            laboratory_id: id,
            lab_test_id: id,
            test_id: id,

            result:
                data.result ??
                '',

            result_value:
                data.result_value ??
                '',

            result_unit:
                data.result_unit ??
                '',

            reference_range:
                data.reference_range ??
                '',

            interpretation:
                data.interpretation ??
                '',

            result_status:
                data.result_status ??
                '',

            completed_by:
                data.completed_by ??
                '',

            completed_at:
                data.completed_at ??
                '',

            notes:
                data.notes ??
                ''
        };

        if (!payload.result) {
            throw new Error(
                'Laboratory result is required.'
            );
        }

        try {
            return await API.post(
                endpoints.complete,
                payload
            );
        } catch (error) {
            console.error(
                'Failed to complete laboratory test:',
                error
            );

            throw error;
        }
    }

    async function cancel(data = {}) {
        const id =
            data.id ??
            data.laboratory_id ??
            data.lab_test_id ??
            data.test_id ??
            '';

        if (!id) {
            throw new Error(
                'Laboratory test ID is required.'
            );
        }

        const payload = {
            id,
            laboratory_id: id,
            lab_test_id: id,
            test_id: id,

            reason:
                data.reason ??
                '',

            notes:
                data.notes ??
                ''
        };

        try {
            return await API.post(
                endpoints.cancel,
                payload
            );
        } catch (error) {
            console.error(
                'Failed to cancel laboratory test:',
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

        state.patientId =
            filters.patient_id ??
            filters.patientId ??
            '';

        state.doctorId =
            filters.doctor_id ??
            filters.doctorId ??
            '';

        state.appointmentId =
            filters.appointment_id ??
            filters.appointmentId ??
            '';

        state.medicalRecordId =
            filters.medical_record_id ??
            filters.medicalRecordId ??
            '';

        state.testType =
            filters.test_type ??
            filters.testType ??
            '';

        state.category =
            filters.category ??
            '';

        state.status =
            filters.status ??
            '';

        state.priority =
            filters.priority ??
            '';

        state.dateFrom =
            filters.date_from ??
            filters.dateFrom ??
            '';

        state.dateTo =
            filters.date_to ??
            filters.dateTo ??
            '';

        state.currentPage = 1;

        return list({
            page: 1,

            search: state.search,

            patient_id:
                state.patientId,

            doctor_id:
                state.doctorId,

            appointment_id:
                state.appointmentId,

            medical_record_id:
                state.medicalRecordId,

            test_type:
                state.testType,

            category:
                state.category,

            status:
                state.status,

            priority:
                state.priority,

            date_from:
                state.dateFrom,

            date_to:
                state.dateTo
        });
    }

    async function clearFilters() {
        state.search = '';
        state.patientId = '';
        state.doctorId = '';
        state.appointmentId = '';
        state.medicalRecordId = '';
        state.testType = '';
        state.category = '';
        state.status = '';
        state.priority = '';
        state.dateFrom = '';
        state.dateTo = '';
        state.currentPage = 1;

        const selectors = [
            '#laboratorySearch',
            '#labPatientFilter',
            '#labDoctorFilter',
            '#labAppointmentFilter',
            '#labMedicalRecordFilter',
            '#labTestTypeFilter',
            '#labCategoryFilter',
            '#labStatusFilter',
            '#labPriorityFilter',
            '#labDateFrom',
            '#labDateTo'
        ];

        selectors.forEach(selector => {
            const element =
                getElement(selector);

            if (element) {
                element.value = '';
            }
        });

        return list({
            page: 1,
            search: '',
            patient_id: '',
            doctor_id: '',
            appointment_id: '',
            medical_record_id: '',
            test_type: '',
            category: '',
            status: '',
            priority: '',
            date_from: '',
            date_to: ''
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

    function validateTest(
        data,
        isUpdate = false
    ) {
        const errors = [];

        if (
            !isUpdate &&
            !data.patient_id
        ) {
            errors.push(
                'Patient is required.'
            );
        }

        if (
            !isUpdate &&
            !data.test_name
        ) {
            errors.push(
                'Laboratory test name is required.'
            );
        }

        if (
            data.patient_id &&
            !/^\d+$/.test(
                String(data.patient_id)
            )
        ) {
            errors.push(
                'Patient ID must be numeric.'
            );
        }

        if (
            data.doctor_id &&
            !/^\d+$/.test(
                String(data.doctor_id)
            )
        ) {
            errors.push(
                'Doctor ID must be numeric.'
            );
        }

        if (
            data.appointment_id &&
            !/^\d+$/.test(
                String(data.appointment_id)
            )
        ) {
            errors.push(
                'Appointment ID must be numeric.'
            );
        }

        if (
            data.medical_record_id &&
            !/^\d+$/.test(
                String(data.medical_record_id)
            )
        ) {
            errors.push(
                'Medical record ID must be numeric.'
            );
        }

        if (
            data.requested_date &&
            Number.isNaN(
                new Date(
                    data.requested_date
                ).getTime()
            )
        ) {
            errors.push(
                'Requested date is invalid.'
            );
        }

        if (
            data.collection_date &&
            Number.isNaN(
                new Date(
                    data.collection_date
                ).getTime()
            )
        ) {
            errors.push(
                'Collection date is invalid.'
            );
        }

        if (
            data.completed_at &&
            Number.isNaN(
                new Date(
                    data.completed_at
                ).getTime()
            )
        ) {
            errors.push(
                'Completion date is invalid.'
            );
        }

        return {
            valid:
                errors.length === 0,

            errors
        };
    }

    function normalizeTestData(
        data = {}
    ) {
        return {
            patient_id:
                data.patient_id ??
                '',

            doctor_id:
                data.doctor_id ??
                '',

            appointment_id:
                data.appointment_id ??
                '',

            medical_record_id:
                data.medical_record_id ??
                '',

            test_name:
                data.test_name ??
                data.laboratory_test_name ??
                data.name ??
                '',

            test_code:
                data.test_code ??
                data.code ??
                '',

            test_type:
                data.test_type ??
                '',

            category:
                data.category ??
                '',

            priority:
                data.priority ??
                'normal',

            requested_date:
                data.requested_date ??
                data.order_date ??
                '',

            clinical_indication:
                data.clinical_indication ??
                data.indication ??
                '',

            specimen_type:
                data.specimen_type ??
                '',

            specimen_number:
                data.specimen_number ??
                '',

            collection_date:
                data.collection_date ??
                '',

            collection_site:
                data.collection_site ??
                '',

            requested_by:
                data.requested_by ??
                '',

            laboratory_id:
                data.laboratory_id ??
                '',

            technician_id:
                data.technician_id ??
                '',

            result:
                data.result ??
                '',

            result_value:
                data.result_value ??
                '',

            result_unit:
                data.result_unit ??
                '',

            reference_range:
                data.reference_range ??
                '',

            interpretation:
                data.interpretation ??
                '',

            result_status:
                data.result_status ??
                '',

            status:
                data.status ??
                'ordered',

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
                'Create laboratory form was not found.'
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
                'Laboratory test created successfully.',
                'success'
            );

            targetForm.reset();

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to create laboratory test.',
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
                'Edit laboratory form was not found.'
            );
        }

        const id =
            targetForm.dataset.id ||
            targetForm.querySelector(
                '[name="id"]'
            )?.value ||
            targetForm.querySelector(
                '[name="laboratory_id"]'
            )?.value ||
            targetForm.querySelector(
                '[name="lab_test_id"]'
            )?.value ||
            targetForm.querySelector(
                '[name="test_id"]'
            )?.value;

        if (!id) {
            showMessage(
                'Laboratory test ID is required.',
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
                'Laboratory test updated successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to update laboratory test.',
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
       Workflow Confirmations
       ========================================================= */

    async function deleteWithConfirmation(
        id
    ) {
        if (!id) {
            return false;
        }

        const confirmed =
            window.confirm(
                'Are you sure you want to delete this laboratory test?'
            );

        if (!confirmed) {
            return false;
        }

        try {
            await remove(id);

            showMessage(
                'Laboratory test deleted successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to delete laboratory test.',
                'error'
            );

            return false;
        }
    }

    async function collectWithConfirmation(
        data
    ) {
        const confirmed =
            window.confirm(
                'Mark this laboratory test specimen as collected?'
            );

        if (!confirmed) {
            return false;
        }

        try {
            await collect(data);

            showMessage(
                'Laboratory specimen collected successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to collect laboratory specimen.',
                'error'
            );

            return false;
        }
    }

    async function processWithConfirmation(
        data
    ) {
        const confirmed =
            window.confirm(
                'Mark this laboratory test as being processed?'
            );

        if (!confirmed) {
            return false;
        }

        try {
            await process(data);

            showMessage(
                'Laboratory test processing started successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to process laboratory test.',
                'error'
            );

            return false;
        }
    }

    async function completeWithConfirmation(
        data
    ) {
        if (!data?.result) {
            showMessage(
                'A laboratory result is required.',
                'error'
            );

            return false;
        }

        const confirmed =
            window.confirm(
                'Complete this laboratory test with the supplied result?'
            );

        if (!confirmed) {
            return false;
        }

        try {
            await complete(data);

            showMessage(
                'Laboratory test completed successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to complete laboratory test.',
                'error'
            );

            return false;
        }
    }

    async function cancelWithConfirmation(
        data
    ) {
        const confirmed =
            window.confirm(
                'Are you sure you want to cancel this laboratory test?'
            );

        if (!confirmed) {
            return false;
        }

        try {
            await cancel(data);

            showMessage(
                'Laboratory test cancelled successfully.',
                'success'
            );

            await refreshList();

            return true;
        } catch (error) {
            showMessage(
                error?.message ||
                'Unable to cancel laboratory test.',
                'error'
            );

            return false;
        }
    }

    /* =========================================================
       Rendering
       ========================================================= */

    function renderTestTable(
        tests = state.tests,
        selector = '#laboratoryTableBody'
    ) {
        const tbody =
            getElement(selector);

        if (!tbody) {
            return;
        }

        if (
            !Array.isArray(tests) ||
            tests.length === 0
        ) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="12"
                        class="empty-state">
                        No laboratory tests found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            tests.map(test => {
                const id =
                    getTestId(test);

                const status =
                    test.status ||
                    'ordered';

                const priority =
                    test.priority ||
                    'normal';

                return `
                    <tr
                        data-id="${escapeHtml(id)}">

                        <td>
                            ${escapeHtml(id)}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    getPatientName(test)
                                )}
                            </strong>

                            ${
                                test.patient_id
                                    ? `
                                        <small>
                                            ID:
                                            ${escapeHtml(
                                                test.patient_id
                                            )}
                                        </small>
                                      `
                                    : ''
                            }
                        </td>

                        <td>
                            ${escapeHtml(
                                getDoctorName(test)
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    getTestName(test)
                                )}
                            </strong>

                            ${
                                test.test_code
                                    ? `
                                        <small>
                                            ${escapeHtml(
                                                test.test_code
                                            )}
                                        </small>
                                      `
                                    : ''
                            }
                        </td>

                        <td>
                            ${escapeHtml(
                                test.test_type ||
                                '—'
                            )}
                        </td>

                        <td>
                            <span
                                class="priority-badge ${getPriorityClass(
                                    priority
                                )}">
                                ${escapeHtml(
                                    capitalize(
                                        priority
                                    )
                                )}
                            </span>
                        </td>

                        <td>
                            <span
                                class="status-badge ${getStatusClass(
                                    status
                                )}">
                                ${escapeHtml(
                                    capitalize(
                                        status
                                    )
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                test.specimen_type ||
                                '—'
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                test.requested_date
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                test.collection_date
                            )}
                        </td>

                        <td>
                            ${
                                test.result
                                    ? `
                                        <span
                                            class="result-available">
                                            Available
                                        </span>
                                      `
                                    : `
                                        <span
                                            class="result-pending">
                                            Pending
                                        </span>
                                      `
                            }
                        </td>

                        <td class="actions">

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="view-laboratory"
                                data-id="${escapeHtml(id)}">
                                View
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="edit-laboratory"
                                data-id="${escapeHtml(id)}">
                                Edit
                            </button>

                            ${
                                status === 'ordered' ||
                                status === 'pending'
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm"
                                            data-action="collect-laboratory"
                                            data-id="${escapeHtml(id)}">
                                            Collect
                                        </button>
                                      `
                                    : ''
                            }

                            ${
                                status === 'collected'
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm"
                                            data-action="process-laboratory"
                                            data-id="${escapeHtml(id)}">
                                            Process
                                        </button>
                                      `
                                    : ''
                            }

                            ${
                                status === 'processing'
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm"
                                            data-action="complete-laboratory"
                                            data-id="${escapeHtml(id)}">
                                            Complete
                                        </button>
                                      `
                                    : ''
                            }

                            ${
                                status !== 'completed' &&
                                status !== 'cancelled'
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-warning"
                                            data-action="cancel-laboratory"
                                            data-id="${escapeHtml(id)}">
                                            Cancel
                                        </button>
                                      `
                                    : ''
                            }

                            <button
                                type="button"
                                class="btn btn-sm btn-danger"
                                data-action="delete-laboratory"
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
        selector = '#laboratoryPagination'
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
            '#laboratoryDetails'
    ) {
        const container =
            getElement(
                containerSelector
            );

        if (!container) {
            return null;
        }

        try {
            const test =
                await get(id);

            container.innerHTML = `
                <div
                    class="laboratory-details">

                    <h3>
                        ${escapeHtml(
                            getTestName(test)
                        )}
                    </h3>

                    <dl>

                        <dt>Laboratory Test ID</dt>
                        <dd>
                            ${escapeHtml(
                                getTestId(test)
                            )}
                        </dd>

                        <dt>Patient</dt>
                        <dd>
                            ${escapeHtml(
                                getPatientName(test)
                            )}
                        </dd>

                        <dt>Doctor</dt>
                        <dd>
                            ${escapeHtml(
                                getDoctorName(test)
                            )}
                        </dd>

                        <dt>Appointment ID</dt>
                        <dd>
                            ${escapeHtml(
                                test.appointment_id ||
                                '—'
                            )}
                        </dd>

                        <dt>Medical Record ID</dt>
                        <dd>
                            ${escapeHtml(
                                test.medical_record_id ||
                                '—'
                            )}
                        </dd>

                        <dt>Test Name</dt>
                        <dd>
                            ${escapeHtml(
                                getTestName(test)
                            )}
                        </dd>

                        <dt>Test Code</dt>
                        <dd>
                            ${escapeHtml(
                                test.test_code ||
                                '—'
                            )}
                        </dd>

                        <dt>Test Type</dt>
                        <dd>
                            ${escapeHtml(
                                test.test_type ||
                                '—'
                            )}
                        </dd>

                        <dt>Category</dt>
                        <dd>
                            ${escapeHtml(
                                test.category ||
                                '—'
                            )}
                        </dd>

                        <dt>Priority</dt>
                        <dd>
                            ${escapeHtml(
                                capitalize(
                                    test.priority ||
                                    'normal'
                                )
                            )}
                        </dd>

                        <dt>Status</dt>
                        <dd>
                            ${escapeHtml(
                                capitalize(
                                    test.status ||
                                    'ordered'
                                )
                            )}
                        </dd>

                        <dt>Clinical Indication</dt>
                        <dd>
                            ${escapeHtml(
                                test.clinical_indication ||
                                test.indication ||
                                '—'
                            )}
                        </dd>

                        <dt>Specimen Type</dt>
                        <dd>
                            ${escapeHtml(
                                test.specimen_type ||
                                '—'
                            )}
                        </dd>

                        <dt>Specimen Number</dt>
                        <dd>
                            ${escapeHtml(
                                test.specimen_number ||
                                '—'
                            )}
                        </dd>

                        <dt>Collection Site</dt>
                        <dd>
                            ${escapeHtml(
                                test.collection_site ||
                                '—'
                            )}
                        </dd>

                        <dt>Requested Date</dt>
                        <dd>
                            ${formatDateTime(
                                test.requested_date
                            )}
                        </dd>

                        <dt>Collection Date</dt>
                        <dd>
                            ${formatDateTime(
                                test.collection_date
                            )}
                        </dd>

                        <dt>Result</dt>
                        <dd>
                            ${escapeHtml(
                                test.result ||
                                'Pending'
                            )}
                        </dd>

                        <dt>Result Value</dt>
                        <dd>
                            ${escapeHtml(
                                test.result_value ||
                                '—'
                            )}
                        </dd>

                        <dt>Result Unit</dt>
                        <dd>
                            ${escapeHtml(
                                test.result_unit ||
                                '—'
                            )}
                        </dd>

                        <dt>Reference Range</dt>
                        <dd>
                            ${escapeHtml(
                                test.reference_range ||
                                '—'
                            )}
                        </dd>

                        <dt>Interpretation</dt>
                        <dd>
                            ${escapeHtml(
                                test.interpretation ||
                                '—'
                            )}
                        </dd>

                        <dt>Result Status</dt>
                        <dd>
                            ${escapeHtml(
                                test.result_status ||
                                '—'
                            )}
                        </dd>

                        <dt>Notes</dt>
                        <dd>
                            ${escapeHtml(
                                test.notes ||
                                '—'
                            )}
                        </dd>

                        ${
                            test.created_at
                                ? `
                                    <dt>Created</dt>
                                    <dd>
                                        ${formatDateTime(
                                            test.created_at
                                        )}
                                    </dd>
                                  `
                                : ''
                        }

                        ${
                            test.updated_at
                                ? `
                                    <dt>Updated</dt>
                                    <dd>
                                        ${formatDateTime(
                                            test.updated_at
                                        )}
                                    </dd>
                                  `
                                : ''
                        }

                    </dl>

                </div>
            `;

            return test;
        } catch (error) {
            container.innerHTML = `
                <div
                    class="message message-error">
                    ${escapeHtml(
                        error?.message ||
                        'Unable to load laboratory test details.'
                    )}
                </div>
            `;

            return null;
        }
    }

    async function loadTestIntoForm(
        id,
        formSelector =
            '#editLaboratoryForm'
    ) {
        const form =
            getElement(
                formSelector
            );

        if (!form) {
            throw new Error(
                'Edit laboratory form was not found.'
            );
        }

        const test =
            await get(id);

        const testId =
            getTestId(test);

        form.dataset.id =
            testId;

        const fields = {
            id: testId,

            laboratory_id:
                testId,

            lab_test_id:
                testId,

            test_id:
                testId,

            patient_id:
                test.patient_id ??
                '',

            doctor_id:
                test.doctor_id ??
                '',

            appointment_id:
                test.appointment_id ??
                '',

            medical_record_id:
                test.medical_record_id ??
                '',

            test_name:
                test.test_name ??
                test.laboratory_test_name ??
                test.name ??
                '',

            test_code:
                test.test_code ??
                '',

            test_type:
                test.test_type ??
                '',

            category:
                test.category ??
                '',

            priority:
                test.priority ??
                'normal',

            requested_date:
                test.requested_date ??
                '',

            clinical_indication:
                test.clinical_indication ??
                test.indication ??
                '',

            specimen_type:
                test.specimen_type ??
                '',

            specimen_number:
                test.specimen_number ??
                '',

            collection_date:
                test.collection_date ??
                '',

            collection_site:
                test.collection_site ??
                '',

            requested_by:
                test.requested_by ??
                '',

            laboratory_id:
                test.laboratory_id ??
                '',

            technician_id:
                test.technician_id ??
                '',

            result:
                test.result ??
                '',

            result_value:
                test.result_value ??
                '',

            result_unit:
                test.result_unit ??
                '',

            reference_range:
                test.reference_range ??
                '',

            interpretation:
                test.interpretation ??
                '',

            result_status:
                test.result_status ??
                '',

            status:
                test.status ??
                'ordered',

            notes:
                test.notes ??
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

        return test;
    }

    /* =========================================================
       Event Binding
       ========================================================= */

    function bindForms() {
        const createForms = [
            '#laboratoryForm',
            '#createLaboratoryForm',
            '#labForm',
            '#createLabForm'
        ];

        createForms.forEach(
            selector => {
                const form =
                    getElement(selector);

                if (
                    !form ||
                    form.dataset
                        .laboratoryBound ===
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

                form.dataset
                    .laboratoryBound =
                    'true';
            }
        );

        const editForm =
            getElement(
                '#editLaboratoryForm'
            ) ||
            getElement(
                '#editLabForm'
            );

        if (
            editForm &&
            editForm.dataset
                .laboratoryBound !==
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

            editForm.dataset
                .laboratoryBound =
                'true';
        }
    }

    function bindSearch() {
        const input =
            getElement(
                '#laboratorySearch'
            );

        if (
            input &&
            input.dataset
                .laboratoryBound !==
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

            input.dataset
                .laboratoryBound =
                'true';
        }

        const button =
            getElement(
                '#searchLaboratory'
            );

        if (
            button &&
            button.dataset
                .laboratoryBound !==
                'true'
        ) {
            button.addEventListener(
                'click',
                () => {
                    search(
                        getValue(
                            '#laboratorySearch'
                        )
                    );
                }
            );

            button.dataset
                .laboratoryBound =
                'true';
        }
    }

    function bindFilters() {
        const applyButton =
            getElement(
                '#applyLaboratoryFilters'
            );

        if (
            applyButton &&
            applyButton.dataset
                .laboratoryBound !==
                'true'
        ) {
            applyButton.addEventListener(
                'click',
                () => {
                    filter({
                        search:
                            getValue(
                                '#laboratorySearch'
                            ),

                        patient_id:
                            getValue(
                                '#labPatientFilter'
                            ),

                        doctor_id:
                            getValue(
                                '#labDoctorFilter'
                            ),

                        appointment_id:
                            getValue(
                                '#labAppointmentFilter'
                            ),

                        medical_record_id:
                            getValue(
                                '#labMedicalRecordFilter'
                            ),

                        test_type:
                            getValue(
                                '#labTestTypeFilter'
                            ),

                        category:
                            getValue(
                                '#labCategoryFilter'
                            ),

                        status:
                            getValue(
                                '#labStatusFilter'
                            ),

                        priority:
                            getValue(
                                '#labPriorityFilter'
                            ),

                        date_from:
                            getValue(
                                '#labDateFrom'
                            ),

                        date_to:
                            getValue(
                                '#labDateTo'
                            )
                    });
                }
            );

            applyButton.dataset
                .laboratoryBound =
                'true';
        }

        const clearButton =
            getElement(
                '#clearLaboratoryFilters'
            );

        if (
            clearButton &&
            clearButton.dataset
                .laboratoryBound !==
                'true'
        ) {
            clearButton.addEventListener(
                'click',
                () => clearFilters()
            );

            clearButton.dataset
                .laboratoryBound =
                'true';
        }
    }

    function bindPerPage() {
        const select =
            getElement(
                '#laboratoryPerPage'
            );

        if (
            !select ||
            select.dataset
                .laboratoryBound ===
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

        select.dataset
            .laboratoryBound =
            'true';
    }

    function bindTableActions() {
        const table =
            getElement(
                '#laboratoryTableBody'
            );

        if (
            !table ||
            table.dataset
                .laboratoryBound ===
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
                    case 'view-laboratory':
                        await showDetails(
                            id
                        );
                        break;

                    case 'edit-laboratory':
                        await loadTestIntoForm(
                            id
                        );
                        break;

                    case 'collect-laboratory':
                        await collectWithConfirmation({
                            id,
                            laboratory_id:
                                id,
                            lab_test_id:
                                id,
                            test_id:
                                id
                        });
                        break;

                    case 'process-laboratory':
                        await processWithConfirmation({
                            id,
                            laboratory_id:
                                id,
                            lab_test_id:
                                id,
                            test_id:
                                id
                        });
                        break;

                    case 'complete-laboratory': {
                        const result =
                            window.prompt(
                                'Enter laboratory test result:'
                            );

                        if (
                            result ===
                            null
                        ) {
                            return;
                        }

                        await completeWithConfirmation({
                            id,
                            laboratory_id:
                                id,
                            lab_test_id:
                                id,
                            test_id:
                                id,
                            result
                        });

                        break;
                    }

                    case 'cancel-laboratory': {
                        const reason =
                            window.prompt(
                                'Enter cancellation reason:'
                            );

                        if (
                            reason ===
                            null
                        ) {
                            return;
                        }

                        await cancelWithConfirmation({
                            id,
                            laboratory_id:
                                id,
                            lab_test_id:
                                id,
                            test_id:
                                id,
                            reason
                        });

                        break;
                    }

                    case 'delete-laboratory':
                        await deleteWithConfirmation(
                            id
                        );
                        break;

                    default:
                        break;
                }
            }
        );

        table.dataset
            .laboratoryBound =
            'true';
    }

    function bindPagination() {
        const container =
            getElement(
                '#laboratoryPagination'
            );

        if (
            !container ||
            container.dataset
                .laboratoryBound ===
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

        container.dataset
            .laboratoryBound =
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
            options.patientId !==
            undefined
        ) {
            state.patientId =
                options.patientId;
        }

        if (
            options.doctorId !==
            undefined
        ) {
            state.doctorId =
                options.doctorId;
        }

        if (
            options.appointmentId !==
            undefined
        ) {
            state.appointmentId =
                options.appointmentId;
        }

        if (
            options.medicalRecordId !==
            undefined
        ) {
            state.medicalRecordId =
                options.medicalRecordId;
        }

        if (
            options.testType !==
            undefined
        ) {
            state.testType =
                options.testType;
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
            options.priority !==
            undefined
        ) {
            state.priority =
                options.priority;
        }

        if (
            options.dateFrom !==
            undefined
        ) {
            state.dateFrom =
                options.dateFrom;
        }

        if (
            options.dateTo !==
            undefined
        ) {
            state.dateTo =
                options.dateTo;
        }

        bindForms();
        bindSearch();
        bindFilters();
        bindPerPage();
        bindTableActions();
        bindPagination();

        const hasLaboratoryUI =
            getElement(
                '#laboratoryTableBody'
            ) ||
            getElement(
                '#laboratoryForm'
            ) ||
            getElement(
                '#createLaboratoryForm'
            ) ||
            getElement(
                '#editLaboratoryForm'
            ) ||
            getElement(
                '#labForm'
            );

        if (
            hasLaboratoryUI &&
            options.autoLoad !== false
        ) {
            await list({
                page: 1,
                limit:
                    state.perPage
            });
        }

        return Laboratory;
    }

    /* =========================================================
       Public API
       ========================================================= */

    const Laboratory = {
        state,
        endpoints,

        list,
        get,
        create,
        update,
        remove,

        collect,
        process,
        complete,
        cancel,

        search,
        filter,
        clearFilters,

        goToPage,
        nextPage,
        previousPage,

        validateTest,
        normalizeTestData,

        formToObject,
        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,
        collectWithConfirmation,
        processWithConfirmation,
        completeWithConfirmation,
        cancelWithConfirmation,

        refreshList,

        renderTestTable,
        renderPagination,

        showDetails,
        loadTestIntoForm,

        init
    };

    window.Laboratory = Laboratory;

    document.addEventListener(
        'DOMContentLoaded',
        () => {
            if (
                document.body?.dataset
                    ?.laboratoryAutoInit ===
                'false'
            ) {
                return;
            }

            Laboratory.init();
        }
    );

})(window);
backend/api/laboratory/
├── create.php
├── list.php
├── get.php
├── update.php
├── delete.php
├── collect.php
├── process.php
├── complete.php
└── cancel.php