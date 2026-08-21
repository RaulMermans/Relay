# Relay product brief

**Name:** Relay

## First customer

Freelance performance marketers and small performance-marketing agencies managing recurring client reporting across paid-media and ecommerce platforms.

## Problem

For each recurring report, the marketer exports data from multiple platforms, cleans inconsistent data, aligns periods, reconciles metrics, calculates KPIs, compares prior periods, identifies drivers, writes commentary, formats a client report, and verifies that report numbers still match the sources.

## Job to be done

When a marketer needs to prepare a recurring client performance report, they want Relay to handle the repetitive data and reporting workflow so they can focus on judgment, strategy, and client communication.

## Product promise

Relay combines a focused performance dashboard with recurring reporting automation. It should shorten the path from validated source data to daily situational awareness and, later, a client-ready report without creating false analytical certainty.

## Product boundaries

Relay is not a real-time BI platform, attribution platform, ad-management platform, or campaign-optimization agent. Its dashboard monitors the freshest validated data supplied to a workspace; its reporting workflow turns the same deterministic facts into a future client-facing artifact.

## Ingestion model

Meta Ads, Google Ads, and Shopify are the initial platforms. CSV uploads and connectors are permanent ingestion methods that must converge into the same canonical data layer.

## Core workflow

Client -> restored dashboard or configured workspace -> reporting period -> data sources -> automatic preparation -> exceptions when needed -> performance dashboard -> deterministic narrative summary -> reviewable client-ready PDF preview.

## Cadence, output, and review

The dashboard supports repeat monitoring whenever fresh data is supplied. The initial reporting cadence assumption remains weekly and monthly, and the planned reporting output remains a client-ready PDF. Relay V1 does not require a generative model; its commentary is deterministic, evidence-backed, and immediately available after analysis.

Sprint 14 makes repeat use tangible with browser-local client configuration, safe mapping reuse, targets, latest dashboard restoration, explicit freshness, and bounded analysis-cycle history. This memory is single-browser convenience, not cloud persistence or a generated-report library.

## Assumption status

This brief is a product hypothesis. Customer need, time reduction, trust, repeat use, and willingness to pay remain unvalidated until evidence is collected through the Sprint 01 protocols and validation experiment.
