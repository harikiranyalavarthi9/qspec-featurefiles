Feature: API Authentication and Token Management
  As a system user
  I want to authenticate via API
  So that I can access protected resources

  Background:
    Given the API is accessible
    And I set the base URL to the API gateway

  Scenario: User logs in with valid credentials
    Given I have valid user credentials
    When I send a login request with email "user@example.com" and password "SecurePass123"
    Then the response status should be 200
    And the response should contain an auth token
    And the token should be valid JWT format

  Scenario: User login fails with invalid password
    Given I have user credentials with email "user@example.com"
    When I send a login request with invalid password "WrongPassword"
    Then the response status should be 401
    And the response should contain error message "Invalid credentials"
    And no auth token should be returned

  Scenario: Token refresh works correctly
    Given I have a valid auth token
    When I send a refresh token request
    Then the response status should be 200
    And a new auth token should be returned
    And the new token should be different from the old one

  Scenario: Expired token is rejected
    Given I have an expired auth token
    When I use the expired token to access a protected resource
    Then the response status should be 401
    And the response should contain error message "Token expired"
