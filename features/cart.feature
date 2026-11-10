# generated-by: squad optimize specs
# source: openspec/specs/cart/spec.md
Feature: cart

  Rule: Percentage discount

    @spec
    Scenario: Valid discount
      Given a cart total of 80
      When a 25% discount is applied
      Then the total is 60

    @spec
    Scenario: Out-of-range discount
      Given a cart total of 80
      When a 120% discount is applied
      Then the discount is rejected
