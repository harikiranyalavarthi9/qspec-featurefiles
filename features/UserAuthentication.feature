Feature: User Authentication
  As a user
  I want to authenticate with valid credentials
  So that I can access the application

  Background:
    Given the authentication service is available

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "testuser@example.com"
    And I enter password "SecurePassword123"
    And I click the login button
    Then I should be authenticated successfully
    And I should be redirected to the dashboard

  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter username "testuser@example.com"
    And I enter password "WrongPassword"
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  @skip
  Scenario: Failed login with non-existent user
    Given I am on the login page
    When I enter username "nonexistent@example.com"
    And I enter password "SecurePassword123"
    And I click the login button
    Then I should see an error message "User not found"
    And I should remain on the login page

  Scenario: Session timeout handling
    Given I am authenticated and logged in
    And my session has expired
    When I attempt to access a protected resource
    Then I should be redirected to the login page
    And I should see a message "Your session has expired"
