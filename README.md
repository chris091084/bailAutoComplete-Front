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

Leases and termination letters are produced from the Word templates in
`src/assets/docx/`, filled in with docxtemplater and delivered as `.docx`.

Rent receipts (*quittances*) are the exception: they are delivered as PDF, drawn
by pdfmake in `src/app/service/quittance.service.ts`. The Word template
`Quittance_de_loyer.docx` is kept as the visual reference the landlord edits,
but **it is no longer read by the code** — editing it does not change the
generated PDF. When an updated template comes in, convert it
(`soffice --headless --convert-to pdf`) and port the differences into
`definitionDocument`.

## Library

Templating: bootstrap@5.2.3
Form building: ReactiveFormsModule
DocxTemplate: docxtemplater@3.5
PDF (quittances): pdfmake@0.3
