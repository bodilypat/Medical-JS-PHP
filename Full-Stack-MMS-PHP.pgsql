medical-management-system/
│
├── index.html
│
├── pages/
│   ├── login.html
│   ├── dashboard.html
│   ├── patients.html
│   ├── appointments.html
│   ├── doctors.html
│   ├── medical-records.html
│   ├── prescriptions.html
│   ├── pharmacy.html
│   ├── inventory.html
│   ├── laboratory.html
│   ├── billing.html
│   └── reports.html
│
├── css/
│   ├── style.css
│   ├── dashboard.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── api.js
│   ├── auth.js
│   ├── patients.js
│   ├── doctors.js
│   ├── appointments.js
│   ├── medical-records.js
│   ├── prescriptions.js
│   ├── pharmacy.js
│   ├── inventory.js
│   ├── laboratory.js
│   ├── billing.js
│   └── reports.js
│
└── assets/
    ├── images/
    └── icons/

│
├── backend/
│   ├── config/
│   │   ├── database.php
│   │   └── config.php
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.php
│   │   │   ├── register.php
│   │   │   ├── me.php 
│   │   │   ├── logout.php
│   │   │   ├── change-password.php 
│   │   │   └── forgot-password.php 
│   │   ├── patients/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php 
│   │   │   └── delete.php
│   │   ├── doctors/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php 
│   │   │   └── delete.php
│   │   ├── appointments/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   ├── cancel.php 
│   │   │   └── delete.php
│   │   ├── medical-records/
│   │   ├── prescriptions/
│   │   ├── pharmacy/
│   │   ├── inventory/
│   │   ├── laboratory/
│   │   ├── billing/
│   │   └── reports/
│   │
│   ├── models/
│   │   ├── User.php
│   │   ├── Patient.php
│   │   ├── Doctor.php 
│   │   ├── Appointment.php
│   │   ├── MedicalRecord.php
│   │   ├── Prescription.php 
│   │   ├── Inventory.php 
│   │   ├── LabTest.php 
│   │   ├── Invoice.php
│   │   └── Report.php
│   ├── controllers/
│   │   ├── AuthController.php 
│   │   ├── PatientController.php
│   │   ├── DoctorController.php
│   │   ├── AppointmentController.php
│   │   ├── MedicalRecordController.php 
│   │   ├── PrescriptionController.php
│   │   ├── PharmacyController.php 
│   │   ├── InventoryController.php 
│   │   ├── LaboratoryController.php 
│   │   ├── BillingController.php
│   │   └── ReportController.php
│   ├── middleware/
│   │   ├── auth.php 
│   │   ├── role.php 
│   │   └── cors.php
│   └── helpers/
│       ├── response.php
│       ├── validation.php 
│       ├── security.php 
│       ├── jwt.php 
│       └── logger.php
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
└── README.md

Authentication flow 

             Login Form
                  │
                  ▼
          POST /auth/login.php
                  │
                  ▼
             Validate input
                  │
                  ▼
           Find user in MySQL
                  │
                  ▼
        password_verify()
                  │
          ┌───────┴────────┐
          │                │
       Invalid            Valid
          │                │
        401                ▼
                   Regenerate Session ID
                           │
                           ▼
                    Create PHP Session
                           │
                           ▼
                     Return JSON



┌───────────────────────────────┐
│           FRONTEND            │
│                               │
│ HTML → JavaScript → api.js    │
└───────────────┬───────────────┘
                │ HTTP/JSON
                ▼
┌───────────────────────────────┐
│          PHP REST API         │
│                               │
│ CORS → Auth → Role → API      │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│         Controllers           │
│                               │
│ Business/application logic    │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│            Models             │
│                               │
│ Database operations / PDO     │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│            MySQL              │
│                               │
│ Patients, Doctors, Billing,   │
│ Pharmacy, Laboratory, etc.    │
└───────────────────────────────┘

medical-management-system/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── patients.html
│   ├── doctors.html
│   ├── appointments.html
│   ├── medical-records.html
│   ├── prescriptions.html
│   ├── pharmacy.html
│   ├── inventory.html
│   ├── laboratory.html
│   ├── billing.html
│   ├── reports.html
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── doctors.js
│   │   ├── appointments.js
│   │   ├── medical-records.js
│   │   ├── prescriptions.js
│   │   ├── pharmacy.js
│   │   ├── inventory.js
│   │   ├── laboratory.js
│   │   ├── billing.js
│   │   └── reports.js
│   │
│   └── assets/
│       ├── images/
│       └── icons/
│
├── backend/
│   ├── config/
│   │   ├── database.php
│   │   └── config.php
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.php
│   │   │   ├── register.php
│   │   │   ├── me.php
│   │   │   ├── logout.php
│   │   │   ├── change-password.php
│   │   │   └── forgot-password.php
│   │   │
│   │   ├── patients/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   └── delete.php
│   │   │
│   │   ├── doctors/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   └── delete.php
│   │   │
│   │   ├── appointments/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   ├── cancel.php
│   │   │   └── delete.php
│   │   │
│   │   ├── medical-records/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   └── delete.php
│   │   │
│   │   ├── prescriptions/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   └── delete.php
│   │   │
│   │   ├── pharmacy/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   └── delete.php
│   │   │
│   │   ├── inventory/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   ├── delete.php
│   │   │   └── stock.php
│   │   │
│   │   ├── laboratory/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   └── delete.php
│   │   │
│   │   ├── billing/
│   │   │   ├── create.php
│   │   │   ├── list.php
│   │   │   ├── get.php
│   │   │   ├── update.php
│   │   │   ├── delete.php
│   │   │   └── payment.php
│   │   │
│   │   └── reports/
│   │       ├── dashboard.php
│   │       ├── patients.php
│   │       ├── appointments.php
│   │       ├── billing.php
│   │       ├── pharmacy.php
│   │       ├── inventory.php
│   │       └── laboratory.php
│   │
│   ├── models/
│   │   ├── User.php
│   │   ├── Patient.php
│   │   ├── Doctor.php
│   │   ├── Appointment.php
│   │   ├── MedicalRecord.php
│   │   ├── Prescription.php
│   │   ├── Pharmacy.php
│   │   ├── Inventory.php
│   │   ├── LabTest.php
│   │   ├── Invoice.php
│   │   └── Report.php
│   │
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── PatientController.php
│   │   ├── DoctorController.php
│   │   ├── AppointmentController.php
│   │   ├── MedicalRecordController.php
│   │   ├── PrescriptionController.php
│   │   ├── PharmacyController.php
│   │   ├── InventoryController.php
│   │   ├── LaboratoryController.php
│   │   ├── BillingController.php
│   │   └── ReportController.php
│   │
│   ├── middleware/
│   │   ├── auth.php
│   │   ├── role.php
│   │   └── cors.php
│   │
│   └── helpers/
│       ├── response.php
│       ├── validation.php
│       ├── security.php
│       ├── jwt.php
│       └── logger.php
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
└── README.md