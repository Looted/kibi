---
title: Login Flow Test
status: active
created_at: 2024-01-16T09:00:00Z
updated_at: 2024-01-16T09:00:00Z
type: scenario
tags:
  - authentication
  - e2e
links:
  - type: specified_by
    target: REQ-001
  - type: relates_to
    target: SCEN-002
---

# Login Flow Test Scenario

## Given
- User exists in the database
- User has valid credentials

## When
- User navigates to /login
- User enters username and password
- User clicks "Login" button

## Then
- User is redirected to dashboard
- Session cookie is set
- User profile is displayed
