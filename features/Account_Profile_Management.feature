Feature: Account Profile Management
  As a registered user
  I want to manage my account details
  So that I can keep my information accurate and up to date

  Background:
    Given I am a registered user
    And I am logged into the application
    And the account profile section is visible

  Scenario: User edits and updates account details successfully
    Given I hover over the account profile section
    When I click the "Edit Details" option
    Then an account details form should be displayed
    And the form should contain fields for name, email, and password
    When I update my name to "John Doe"
    And I update my email to "john.doe@example.com"
    And I click the "Save" button
    Then my account details should be updated successfully
    And I should see a confirmation message "Account details updated successfully"