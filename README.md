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

## Deleting personal data (GDPR)

The *Locataires* screen is where personal data is removed. The back-end does the
actual deletion; see its README (section *RGPD*) and `doc-registre-traitements.md`.

- **Candidats tab** — *Supprimer* deletes a candidate (a lease was generated but
  never signed), together with the lease and its generation history. Only
  candidates can be deleted; a signed tenant leaves the flat instead.
- **Locataires sortis tab** — each former tenant is deleted automatically 3 years
  after leaving (once the back-end purge is enabled). The *Ne pas supprimer* switch exempts a tenant (ongoing dispute,
  longer retention duty). It calls `PUT /locataire/:id/conservation`.

After a deletion, remember to remove the tenant's e-mails and messages by hand:
the back-end sends a reminder with the addresses to search for.

## Library

Templating: bootstrap@5.2.3
Form building: ReactiveFormsModule
DocxTemplate: docxtemplater@3.5
