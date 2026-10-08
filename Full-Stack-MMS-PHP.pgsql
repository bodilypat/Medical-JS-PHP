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

medical-management-system/
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── patients.html
│   ├── appointments.html
│   ├── doctors.html
│   ├── pharmacy.html
│   ├── inventory.html
│   ├── laboratory.html
│   ├── billing.html
│   ├── reports.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── patients.js
│       ├── appointments.js
│       ├── pharmacy.js
│       └── inventory.js
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