# Cart

### Requirement: Percentage discount
The cart total SHALL accept a percentage discount between 0 and 100, rounded to two decimals.

#### Scenario: Valid discount
- **GIVEN** a cart total of 80
- **WHEN** a 25% discount is applied
- **THEN** the total is 60

#### Scenario: Out-of-range discount
- **GIVEN** a cart total of 80
- **WHEN** a 120% discount is applied
- **THEN** the discount is rejected
