## MODIFIED Requirements

### Requirement: Rooms need a connection

While the device is offline, the Co-op screen SHALL say that rooms need an internet connection, and SHALL disable creating, joining, Quick Play and the open rooms. The Hall's World tables SHALL say they need a connection. Once the connection returns, they SHALL work again.

#### Scenario: Offline co-op screen

- **WHEN** the player opens Co-op while offline
- **THEN** a message says rooms need a connection, and Create and Join are disabled
