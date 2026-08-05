# BailAutoComplet

_Licence MIT_

BailAutoComplet lets you generate rental lease agreements quickly and accurately by simply filling out a web form. By automating the lease template, it minimizes the risk of errors and ensures consistency across all documents

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 19.

## Prerequisites

- Java 11 + (or your project’s JDK version)
- Maven 3.6+
- Node.js v18.14.2
- Angular CLI 17.3
- Docker & Docker Compose

## Installation

```bash
git clone https://github.com/votre-compte/bailautocomplet.git
cd bailautocomplet
npm install
```

### Clone the back-end

```bash
git clone git@github.com:chris091084/back-bailAutoComplet.git
cd back-bailAutoComplet
```

more info see back project

## Run Docker

To create and activ the container
run `docker-compose up --build -d`

## Run Server

If it's your first time you have to run this:
`npm install`

Then

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Document templates

Every document comes from a Word template in `src/assets/docx/`, filled in with
docxtemplater. Those templates are the source of truth: the landlord edits them
in Word, and the change shows up in the generated documents without touching any
code.

Leases and termination letters are delivered as `.docx` — the tenant still has
fields to fill in on the termination letter.

Rent receipts (*quittances*) are delivered as PDF. The browser fills
`Quittance_de_loyer.docx` as usual, then posts each document to the API
(`POST /documents/pdf`), which converts it with LibreOffice and returns the PDF.
One receipt per month is produced, and the conversions run one at a time — see
`quittance.service.ts` and the backend's `documents` module.

## Library

Templating: bootstrap@5.2.3
Form building: ReactiveFormsModule
DocxTemplate: docxtemplater@3.5
