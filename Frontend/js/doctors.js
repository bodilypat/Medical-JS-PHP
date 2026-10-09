/**
 * Medical Management System
 * Frontend/js/doctors.js
 *
 * Doctor operations:
 * - Load doctors
 * - Search doctors
 * - Filter doctors
 * - Pagination
 * - Get doctor
 * - Create doctor
 * - Update doctor
 * - Delete doctor
 * - Doctor form handling
 * - Doctor details
 */

'use strict';

const Doctors = (() => {

    const state = {
        doctors: [],
        currentDoctor: null,
        currentPage: 1,
        perPage: 10,
        total: 0,
        search: '',
        status: '',
        specialization: '',
        department: '',
        loading: false
    };

    const endpoints = {
        list: '/doctors/list.php',
        get: '/doctors/get.php',
        create: '/doctors/create.php',
        update: '/doctors/update.php',
        delete: '/doctors/delete.php'
    };


    /* ============================================================
       LIST DOCTORS
       ============================================================ */

    async function list(options = {}) {

        const params = {
            page: options.page || state.currentPage,
            limit: options.limit || state.perPage,
            search: options.search ?? state.search,
            status: options.status ?? state.status,
            specialization:
                options.specialization ??
                state.specialization,
            department:
                options.department ??
                state.department
        };

        state.loading = true;

        try {

            const query = new URLSearchParams();

            Object.entries(params).forEach(([key, value]) => {

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    query.append(key, value);
                }
            });

            const url =
                `${endpoints.list}?${query.toString()}`;

            const response = await API.get(url);

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to load doctors.'
                );
            }

            const data =
                response.data || response;

            state.doctors =
                Array.isArray(data.doctors)
                    ? data.doctors
                    : Array.isArray(data)
                        ? data
                        : [];

            state.total =
                Number(
                    data.total ??
                    response.total ??
                    state.doctors.length
                );

            state.currentPage =
                Number(
                    data.page ??
                    params.page
                );

            state.perPage =
                Number(
                    data.limit ??
                    params.limit
                );

            return {
                success: true,
                doctors: state.doctors,
                total: state.total,
                page: state.currentPage,
                limit: state.perPage
            };

        } catch (error) {

            console.error(
                'Doctor list error:',
                error
            );

            throw error;

        } finally {

            state.loading = false;
        }
    }


    /* ============================================================
       GET DOCTOR
       ============================================================ */

    async function get(id) {

        if (!id) {
            throw new Error(
                'Doctor ID is required.'
            );
        }

        try {

            const response = await API.get(
                `${endpoints.get}?id=${encodeURIComponent(id)}`
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to retrieve doctor.'
                );
            }

            const doctor =
                response.data?.doctor ||
                response.doctor ||
                response.data;

            state.currentDoctor =
                doctor || null;

            return doctor;

        } catch (error) {

            console.error(
                'Get doctor error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       CREATE DOCTOR
       ============================================================ */

    async function create(doctorData) {

        validateDoctor(doctorData);

        try {

            const response = await API.post(
                endpoints.create,
                normalizeDoctorData(doctorData)
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to create doctor.'
                );
            }

            const doctor =
                response.data?.doctor ||
                response.doctor ||
                response.data;

            return {
                success: true,
                doctor,
                message:
                    response.message ||
                    'Doctor created successfully.'
            };

        } catch (error) {

            console.error(
                'Create doctor error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       UPDATE DOCTOR
       ============================================================ */

    async function update(id, doctorData) {

        if (!id) {
            throw new Error(
                'Doctor ID is required.'
            );
        }

        validateDoctor(doctorData);

        try {

            const payload = {
                id,
                ...normalizeDoctorData(doctorData)
            };

            const response = await API.post(
                endpoints.update,
                payload
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to update doctor.'
                );
            }

            const doctor =
                response.data?.doctor ||
                response.doctor ||
                response.data;

            return {
                success: true,
                doctor,
                message:
                    response.message ||
                    'Doctor updated successfully.'
            };

        } catch (error) {

            console.error(
                'Update doctor error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       DELETE DOCTOR
       ============================================================ */

    async function remove(id) {

        if (!id) {
            throw new Error(
                'Doctor ID is required.'
            );
        }

        try {

            const response = await API.post(
                endpoints.delete,
                { id }
            );

            if (!response || response.success === false) {
                throw new Error(
                    response?.message ||
                    'Unable to delete doctor.'
                );
            }

            return {
                success: true,
                message:
                    response.message ||
                    'Doctor deleted successfully.'
            };

        } catch (error) {

            console.error(
                'Delete doctor error:',
                error
            );

            throw error;
        }
    }


    /* ============================================================
       SEARCH
       ============================================================ */

    async function search(term) {

        state.search =
            typeof term === 'string'
                ? term.trim()
                : '';

        state.currentPage = 1;

        return await list();
    }


    /* ============================================================
       FILTER
       ============================================================ */

    async function filter(filters = {}) {

        state.search =
            filters.search ?? '';

        state.status =
            filters.status ?? '';

        state.specialization =
            filters.specialization ?? '';

        state.department =
            filters.department ?? '';

        state.currentPage = 1;

        return await list();
    }


    /* ============================================================
       PAGINATION
       ============================================================ */

    async function goToPage(page) {

        page = Number(page);

        if (
            !Number.isInteger(page) ||
            page < 1
        ) {
            return;
        }

        state.currentPage = page;

        return await list();
    }


    async function nextPage() {

        const totalPages =
            Math.ceil(
                state.total /
                state.perPage
            );

        if (
            state.currentPage >=
            totalPages
        ) {
            return;
        }

        return await goToPage(
            state.currentPage + 1
        );
    }


    async function previousPage() {

        if (state.currentPage <= 1) {
            return;
        }

        return await goToPage(
            state.currentPage - 1
        );
    }


    /* ============================================================
       VALIDATION
       ============================================================ */

    function validateDoctor(doctor) {

        if (
            !doctor ||
            typeof doctor !== 'object'
        ) {
            throw new Error(
                'Doctor information is required.'
            );
        }

        const firstName =
            doctor.first_name ??
            doctor.firstName;

        const lastName =
            doctor.last_name ??
            doctor.lastName;

        if (
            !firstName ||
            !String(firstName).trim()
        ) {
            throw new Error(
                'First name is required.'
            );
        }

        if (
            !lastName ||
            !String(lastName).trim()
        ) {
            throw new Error(
                'Last name is required.'
            );
        }

        const email =
            doctor.email;

        if (
            email &&
            !isValidEmail(email)
        ) {
            throw new Error(
                'Please enter a valid email address.'
            );
        }

        if (
            !doctor.specialization &&
            !doctor.specialty
        ) {
            throw new Error(
                'Specialization is required.'
            );
        }

        return true;
    }


    /* ============================================================
       NORMALIZE DOCTOR DATA
       ============================================================ */

    function normalizeDoctorData(doctor) {

        return {

            first_name:
                clean(
                    doctor.first_name ??
                    doctor.firstName
                ),

            middle_name:
                clean(
                    doctor.middle_name ??
                    doctor.middleName
                ),

            last_name:
                clean(
                    doctor.last_name ??
                    doctor.lastName
                ),

            gender:
                clean(doctor.gender),

            date_of_birth:
                clean(
                    doctor.date_of_birth ??
                    doctor.dateOfBirth
                ),

            specialization:
                clean(
                    doctor.specialization ??
                    doctor.specialty
                ),

            department:
                clean(
                    doctor.department
                ),

            license_number:
                clean(
                    doctor.license_number ??
                    doctor.licenseNumber
                ),

            qualification:
                clean(
                    doctor.qualification ??
                    doctor.qualifications
                ),

            experience_years:
                clean(
                    doctor.experience_years ??
                    doctor.experienceYears
                ),

            phone:
                clean(doctor.phone),

            email:
                clean(doctor.email),

            address:
                clean(doctor.address),

            city:
                clean(doctor.city),

            state:
                clean(doctor.state),

            postal_code:
                clean(
                    doctor.postal_code ??
                    doctor.postalCode
                ),

            consultation_fee:
                clean(
                    doctor.consultation_fee ??
                    doctor.consultationFee
                ),

            availability:
                clean(doctor.availability),

            status:
                clean(doctor.status) ||
                'active'
        };
    }


    /* ============================================================
       FORM → OBJECT
       ============================================================ */

    function formToObject(form) {

        if (!form) {
            throw new Error(
                'Doctor form was not found.'
            );
        }

        const formData =
            new FormData(form);

        const data = {};

        formData.forEach((value, key) => {

            data[key] =
                typeof value === 'string'
                    ? value.trim()
                    : value;
        });

        return data;
    }


    /* ============================================================
       CREATE FORM
       ============================================================ */

    async function submitCreateForm(form) {

        const doctor =
            formToObject(form);

        const result =
            await create(doctor);

        showMessage(
            result.message,
            'success'
        );

        form.reset();

        await refreshList();

        return result;
    }


    /* ============================================================
       UPDATE FORM
       ============================================================ */

    async function submitUpdateForm(
        form,
        doctorId
    ) {

        const doctor =
            formToObject(form);

        const result =
            await update(
                doctorId,
                doctor
            );

        showMessage(
            result.message,
            'success'
        );

        await refreshList();

        return result;
    }


    /* ============================================================
       DELETE WITH CONFIRMATION
       ============================================================ */

    async function deleteWithConfirmation(id) {

        if (!id) {
            return;
        }

        const confirmed =
            window.confirm(
                'Are you sure you want to delete this doctor? This action cannot be undone.'
            );

        if (!confirmed) {
            return {
                success: false,
                cancelled: true
            };
        }

        const result =
            await remove(id);

        showMessage(
            result.message,
            'success'
        );

        await refreshList();

        return result;
    }


    /* ============================================================
       REFRESH LIST
       ============================================================ */

    async function refreshList() {

        const result =
            await list();

        renderDoctorTable(
            result.doctors
        );

        renderPagination(
            result.total,
            result.page,
            result.limit
        );

        return result;
    }


    /* ============================================================
       RENDER DOCTOR TABLE
       ============================================================ */

    function renderDoctorTable(
        doctors,
        selector = '#doctorsTableBody'
    ) {

        const tbody =
            document.querySelector(selector);

        if (!tbody) {
            return;
        }

        tbody.innerHTML = '';

        if (
            !Array.isArray(doctors) ||
            doctors.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="empty-state">
                        No doctors found.
                    </td>
                </tr>
            `;

            return;
        }

        doctors.forEach(doctor => {

            const id =
                doctor.id ??
                doctor.doctor_id;

            const fullName =
                [
                    doctor.first_name,
                    doctor.middle_name,
                    doctor.last_name
                ]
                    .filter(Boolean)
                    .join(' ');

            const row =
                document.createElement('tr');

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        doctor.doctor_number ||
                        doctor.doctor_code ||
                        id ||
                        ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        fullName
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        doctor.specialization ||
                        doctor.specialty ||
                        ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        doctor.department ||
                        ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        doctor.license_number ||
                        ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        doctor.phone ||
                        ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        doctor.email ||
                        ''
                    )}
                </td>

                <td>
                    <span class="status-badge status-${escapeHtml(
                        String(
                            doctor.status ||
                            'active'
                        ).toLowerCase()
                    )}">
                        ${escapeHtml(
                            formatStatus(
                                doctor.status
                            )
                        )}
                    </span>
                </td>

                <td class="actions">

                    <button
                        type="button"
                        class="btn btn-sm btn-view"
                        data-action="view-doctor"
                        data-id="${escapeHtml(id)}"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-edit"
                        data-action="edit-doctor"
                        data-id="${escapeHtml(id)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        data-action="delete-doctor"
                        data-id="${escapeHtml(id)}"
                    >
                        Delete
                    </button>

                </td>
            `;

            tbody.appendChild(row);
        });
    }


    /* ============================================================
       RENDER PAGINATION
       ============================================================ */

    function renderPagination(
        total,
        page,
        limit,
        selector = '#doctorsPagination'
    ) {

        const container =
            document.querySelector(selector);

        if (!container) {
            return;
        }

        const totalPages =
            Math.ceil(
                total / limit
            );

        container.innerHTML = '';

        if (totalPages <= 1) {
            return;
        }

        const previous =
            document.createElement('button');

        previous.type = 'button';
        previous.className =
            'pagination-btn';

        previous.textContent =
            'Previous';

        previous.disabled =
            page <= 1;

        previous.addEventListener(
            'click',
            () => previousPage()
        );

        container.appendChild(previous);


        /*
         * Limit the number of visible page
         * buttons for large datasets.
         */
        const maxButtons = 7;

        let startPage =
            Math.max(
                1,
                page - Math.floor(
                    maxButtons / 2
                )
            );

        let endPage =
            Math.min(
                totalPages,
                startPage + maxButtons - 1
            );

        if (
            endPage - startPage + 1 <
            maxButtons
        ) {

            startPage =
                Math.max(
                    1,
                    endPage - maxButtons + 1
                );
        }


        for (
            let pageNumber = startPage;
            pageNumber <= endPage;
            pageNumber++
        ) {

            const button =
                document.createElement('button');

            button.type = 'button';

            button.className =
                'pagination-btn';

            if (
                pageNumber === page
            ) {
                button.classList.add(
                    'active'
                );
            }

            button.textContent =
                pageNumber;

            button.addEventListener(
                'click',
                () => goToPage(pageNumber)
            );

            container.appendChild(button);
        }


        const next =
            document.createElement('button');

        next.type = 'button';

        next.className =
            'pagination-btn';

        next.textContent =
            'Next';

        next.disabled =
            page >= totalPages;

        next.addEventListener(
            'click',
            () => nextPage()
        );

        container.appendChild(next);
    }


    /* ============================================================
       SHOW DOCTOR DETAILS
       ============================================================ */

    async function showDetails(
        id,
        containerSelector = '#doctorDetails'
    ) {

        const container =
            document.querySelector(
                containerSelector
            );

        const doctor =
            await get(id);

        if (!container) {
            return doctor;
        }

        const fullName =
            [
                doctor.first_name,
                doctor.middle_name,
                doctor.last_name
            ]
                .filter(Boolean)
                .join(' ');

        container.innerHTML = `

            <div class="doctor-details">

                <h2>
                    ${escapeHtml(
                        fullName
                    )}
                </h2>

                <div class="details-grid">

                    <div>
                        <strong>Doctor ID</strong>
                        <span>
                            ${escapeHtml(
                                doctor.doctor_number ||
                                doctor.doctor_code ||
                                doctor.id ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Specialization</strong>
                        <span>
                            ${escapeHtml(
                                doctor.specialization ||
                                doctor.specialty ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Department</strong>
                        <span>
                            ${escapeHtml(
                                doctor.department ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>License Number</strong>
                        <span>
                            ${escapeHtml(
                                doctor.license_number ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Qualification</strong>
                        <span>
                            ${escapeHtml(
                                doctor.qualification ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Experience</strong>
                        <span>
                            ${escapeHtml(
                                doctor.experience_years ??
                                ''
                            )}
                            ${
                                doctor.experience_years
                                    ? ' years'
                                    : ''
                            }
                        </span>
                    </div>

                    <div>
                        <strong>Phone</strong>
                        <span>
                            ${escapeHtml(
                                doctor.phone ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Email</strong>
                        <span>
                            ${escapeHtml(
                                doctor.email ||
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Consultation Fee</strong>
                        <span>
                            ${escapeHtml(
                                doctor.consultation_fee ??
                                ''
                            )}
                        </span>
                    </div>

                    <div>
                        <strong>Status</strong>
                        <span>
                            ${escapeHtml(
                                formatStatus(
                                    doctor.status
                                )
                            )}
                        </span>
                    </div>

                </div>

            </div>
        `;

        return doctor;
    }


    /* ============================================================
       LOAD DOCTOR INTO EDIT FORM
       ============================================================ */

    async function loadDoctorIntoForm(id) {

        const doctor =
            await get(id);

        const form =
            document.querySelector(
                '#doctorForm'
            );

        if (!form) {
            return doctor;
        }

        Object.entries(doctor)
            .forEach(([key, value]) => {

                const input =
                    form.elements.namedItem(
                        key
                    );

                if (!input) {
                    return;
                }

                input.value =
                    value ?? '';
            });

        const idInput =
            form.elements.namedItem(
                'id'
            );

        if (idInput) {

            idInput.value =
                doctor.id ??
                doctor.doctor_id ??
                '';
        }

        form.dataset.mode =
            'edit';

        form.dataset.doctorId =
            doctor.id ??
            doctor.doctor_id ??
            '';

        return doctor;
    }


    /* ============================================================
       INITIALIZE DOCTOR PAGE
       ============================================================ */

    async function init() {

        if (typeof API === 'undefined') {

            console.error(
                'API client is not loaded.'
            );

            return;
        }

        try {

            await refreshList();

            setupSearch();

            setupFilters();

            setupDoctorActions();

            setupDoctorForms();

        } catch (error) {

            console.error(
                'Doctor page initialization failed:',
                error
            );

            showMessage(
                error.message ||
                'Unable to load doctors.',
                'error'
            );
        }
    }


    /* ============================================================
       SEARCH EVENTS
       ============================================================ */

    function setupSearch() {

        const input =
            document.querySelector(
                '#doctorSearch'
            );

        if (!input) {
            return;
        }

        let timer;

        input.addEventListener(
            'input',
            () => {

                clearTimeout(timer);

                timer = setTimeout(
                    () => search(
                        input.value
                    ),
                    400
                );
            }
        );
    }


    /* ============================================================
       FILTER EVENTS
       ============================================================ */

    function setupFilters() {

        const status =
            document.querySelector(
                '#doctorStatusFilter'
            );

        const specialization =
            document.querySelector(
                '#doctorSpecializationFilter'
            );

        const department =
            document.querySelector(
                '#doctorDepartmentFilter'
            );

        const apply =
            document.querySelector(
                '#applyDoctorFilters'
            );


        const getFilters = () => ({
            status:
                status?.value || '',

            specialization:
                specialization?.value || '',

            department:
                department?.value || '',

            search:
                document.querySelector(
                    '#doctorSearch'
                )?.value || ''
        });


        if (apply) {

            apply.addEventListener(
                'click',
                () => filter(
                    getFilters()
                )
            );
        }


        [
            status,
            specialization,
            department
        ]
            .filter(Boolean)
            .forEach(select => {

                select.addEventListener(
                    'change',
                    () => filter(
                        getFilters()
                    )
                );
            });
    }


    /* ============================================================
       DOCTOR ACTION BUTTONS
       ============================================================ */

    function setupDoctorActions() {

        document.addEventListener(
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

                try {

                    switch (action) {

                        case 'view-doctor':

                            await showDetails(
                                id
                            );

                            break;

                        case 'edit-doctor':

                            await loadDoctorIntoForm(
                                id
                            );

                            break;

                        case 'delete-doctor':

                            await deleteWithConfirmation(
                                id
                            );

                            break;
                    }

                } catch (error) {

                    console.error(
                        'Doctor action failed:',
                        error
                    );

                    showMessage(
                        error.message ||
                        'Doctor operation failed.',
                        'error'
                    );
                }
            }
        );
    }


    /* ============================================================
       DOCTOR FORM EVENTS
       ============================================================ */

    function setupDoctorForms() {

        const forms =
            document.querySelectorAll(
                '#doctorForm, #createDoctorForm, #editDoctorForm'
            );

        forms.forEach(form => {

            form.addEventListener(
                'submit',
                async event => {

                    event.preventDefault();

                    try {

                        const doctor =
                            formToObject(
                                form
                            );

                        const doctorId =
                            form.dataset.doctorId ||
                            doctor.id;

                        let result;

                        if (
                            doctorId &&
                            (
                                form.dataset.mode ===
                                'edit' ||
                                form.id ===
                                'editDoctorForm'
                            )
                        ) {

                            result =
                                await update(
                                    doctorId,
                                    doctor
                                );

                        } else {

                            result =
                                await create(
                                    doctor
                                );
                        }

                        showMessage(
                            result.message,
                            'success'
                        );

                        form.reset();

                        delete form.dataset.mode;
                        delete form.dataset.doctorId;

                        await refreshList();

                    } catch (error) {

                        console.error(
                            'Doctor form error:',
                            error
                        );

                        showMessage(
                            error.message ||
                            'Unable to save doctor.',
                            'error'
                        );
                    }
                }
            );
        });
    }


    /* ============================================================
       UTILITY FUNCTIONS
       ============================================================ */

    function clean(value) {

        if (
            value === undefined ||
            value === null
        ) {
            return '';
        }

        return String(value).trim();
    }


    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);
    }


    function formatStatus(status) {

        if (!status) {
            return 'Active';
        }

        return String(status)
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, char =>
                char.toUpperCase()
            );
    }


    function escapeHtml(value) {

        if (
            value === undefined ||
            value === null
        ) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function showMessage(
        message,
        type = 'info'
    ) {

        const element =
            document.querySelector(
                '#doctorMessage'
            );

        if (!element) {
            return;
        }

        element.textContent =
            message || '';

        element.className =
            `message message-${type}`;

        element.hidden = false;

        setTimeout(() => {
            element.hidden = true;
        }, 5000);
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    return {

        state,

        list,
        get,
        create,
        update,
        remove,

        search,
        filter,

        goToPage,
        nextPage,
        previousPage,

        refreshList,

        showDetails,
        loadDoctorIntoForm,

        formToObject,
        validateDoctor,

        submitCreateForm,
        submitUpdateForm,

        deleteWithConfirmation,

        init
    };

})();


/*
 * Make Doctors available globally.
 */
window.Doctors = Doctors;


/* ================================================================
   AUTO INITIALIZATION
   ================================================================ */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        if (
            document.querySelector(
                '#doctorsTableBody'
            ) ||
            document.querySelector(
                '#doctorForm'
            )
        ) {
            Doctors.init();
        }
    }
);

doctors.html
     │
     ▼
doctors.js
     │
     ▼
api.js
     │
     ├── doctors/list.php
     ├── doctors/get.php
     ├── doctors/create.php
     ├── doctors/update.php
     └── doctors/delete.php
             │
             ▼
      DoctorController.php
             │
             ▼
          Doctor.php
             │
             ▼
           MySQL

           