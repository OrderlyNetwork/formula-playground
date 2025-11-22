---
name: generate-api-mock-rules
version: 1.0.0
description: Generate mock API YAML files from API descriptions, TypeScript interfaces, OpenAPI specs, or natural language descriptions. Creates properly structured YAML files in the .mock directory following the project's specification. CRITICAL: Always generate comprehensive rules covering all edge cases and boundary conditions.
---

# Generate API Mock Rules

This skill helps create mock API YAML configuration files for the VS Code Mock Server extension.

## 📚 Quick Navigation

- **[Examples](examples.md)**: Complete usage examples showing different input types
- **[Templates](templates/)**: Pre-built templates for common API patterns

## ⚠️ Core Principle: Comprehensive Edge Case Coverage

**IMPORTANT**: When generating mock rules, you MUST create comprehensive coverage of edge cases and boundary conditions. This is critical for thorough testing and development. Never generate just a single "happy path" rule.

## Capabilities

1. **From API Description**: Generate YAML from natural language API descriptions
2. **From TypeScript Interfaces**: Convert TypeScript type definitions to mock responses
3. **From OpenAPI Specification**: Import OpenAPI/Swagger specs and create mock files
4. **Interactive Creation**: Guide users through creating complete mock configurations

## Available Templates

Use these templates as starting points for common API patterns (located in `templates/`):

- **[basic_api.yaml](templates/basic_api.yaml)**: Basic API endpoint with minimal rules
- **[get_collection.yaml](templates/get_collection.yaml)**: GET endpoint for fetching collections/lists
- **[get_single.yaml](templates/get_single.yaml)**: GET endpoint for fetching a single resource by ID
- **[create.yaml](templates/create.yaml)**: POST endpoint for creating new resources
- **[update.yaml](templates/update.yaml)**: PUT/PATCH endpoint for updating resources
- **[delete.yaml](templates/delete.yaml)**: DELETE endpoint for removing resources
- **[auth_login.yaml](templates/auth_login.yaml)**: Authentication/login endpoint with comprehensive security scenarios

> 💡 **See all template files**: Browse the [templates/](templates/) directory for the complete template collection.

## Field Descriptions

- **name**: Human-readable name for the API (preferably in Chinese)
- **description**: Detailed description of what the API does
- **method**: HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- **endpoint**: API path, use `:paramName` for path parameters
- **rules**: Array of response rules, each containing:
  - **name**: Rule scenario name (preferably in Chinese)
  - **status**: HTTP status code (200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 503, 504, etc.)
  - **headers**: HTTP response headers (always include `Content-Type`)
  - **body**: Response payload (object, array, string, number, boolean, or null)
  - **delay**: Response delay in milliseconds (0 for normal, 100-500 for slow network, 1000+ for timeout)

> **📚 Examples**: See **[examples.md](examples.md)** for comprehensive usage examples demonstrating different input types and edge case coverage.

## Best Practices

1. **Comprehensive Edge Case Coverage** (CRITICAL): Always create 5-8+ rules per API covering:

   **Success Cases:**

   - Normal success response (200/201)
   - Success with edge data (empty arrays, null optionals, minimum values)
   - Success with maximum data (large arrays, long strings, maximum values)

   **Client Error Cases (4xx):**

   - Bad request (400) - invalid input format, missing required fields
   - Unauthorized (401) - missing or expired token
   - Forbidden (403) - insufficient permissions
   - Not found (404) - resource doesn't exist
   - Conflict (409) - duplicate resources, concurrent modification
   - Validation errors (422) - business logic validation failures
   - Rate limiting (429) - too many requests

   **Server Error Cases (5xx):**

   - Internal server error (500) - unexpected server failure
   - Service unavailable (503) - service temporarily down
   - Gateway timeout (504) - upstream service timeout

   **Edge Cases:**

   - Empty lists/arrays for collection endpoints
   - Null/undefined optional fields
   - Boundary values (0, max integers, empty strings)
   - Special characters in strings
   - Large payloads for pagination testing
   - Slow responses for timeout testing

2. **Realistic Data**: Generate realistic sample data based on field names and types

3. **Proper Delays**: Add delays for specific scenarios:

   - 0ms for normal responses
   - 100-500ms for slow network simulation
   - 1000ms+ for timeout testing

4. **Headers**: Always include `Content-Type` header, add others as needed:

   - `Authorization` for auth-related responses
   - `X-Rate-Limit-*` for rate limiting
   - `Cache-Control` for caching

5. **File Naming**: Use snake_case for filenames based on the endpoint:
   - `GET /api/user` → `get_user.yaml`
   - `POST /api/orders` → `create_order.yaml`
   - `PUT /api/profile` → `update_profile.yaml`

## Implementation Steps

When a user requests to create a mock API:

1. **Analyze Input**: Determine the source type (description, interface, OpenAPI, etc.)

2. **Select Template**: Choose the most appropriate template from the available templates:

   - **GET collection** → [`get_collection.yaml`](templates/get_collection.yaml)
   - **GET single resource** → [`get_single.yaml`](templates/get_single.yaml)
   - **POST/Create** → [`create.yaml`](templates/create.yaml)
   - **PUT/PATCH/Update** → [`update.yaml`](templates/update.yaml)
   - **DELETE** → [`delete.yaml`](templates/delete.yaml)
   - **Login/Auth** → [`auth_login.yaml`](templates/auth_login.yaml)
   - **Custom/Other** → [`basic_api.yaml`](templates/basic_api.yaml)

3. **Extract Information**:

   - HTTP method
   - Endpoint path
   - Request/response structure
   - **ALL possible error scenarios and edge cases**

4. **Identify Edge Cases** (CRITICAL):

   - What are the boundary values? (empty, null, max, min)
   - What can go wrong? (auth, validation, server errors)
   - What are the different states? (created, pending, completed, failed)
   - What are the rate limits or quotas?
   - What happens with concurrent access?

5. **Generate Comprehensive Rules**: Create 5-8+ rules covering:

   - At least 2 success scenarios (normal + edge)
   - At least 3-5 error scenarios (client + server errors)
   - At least 1-2 edge cases (empty data, boundaries)

6. **Generate Filename**: Convert endpoint to snake_case filename:

   - `GET /api/user` → `get_user.yaml`
   - `POST /api/orders` → `create_order.yaml`
   - `PUT /api/profile` → `update_profile.yaml`

7. **Create YAML Content**: Follow the structure with ALL rules, using the selected template as base

8. **Write File**: Save to `.mock/[filename].yaml`

9. **Confirm**: Show the user what was created and which edge cases are covered

## Edge Case Checklist

When creating mock rules, consider these categories:

### Data Boundaries

- ✅ Empty collections ([], {})
- ✅ Null/undefined optional fields
- ✅ Minimum values (0, empty string, false)
- ✅ Maximum values (large numbers, long strings, max array length)
- ✅ Special characters and unicode
- ✅ Invalid data formats

### Authentication & Authorization

- ✅ Missing authentication token (401)
- ✅ Expired token (401)
- ✅ Invalid token format (401)
- ✅ Insufficient permissions (403)
- ✅ Valid but unauthorized resource access (403)

### Resource States

- ✅ Resource exists (200)
- ✅ Resource not found (404)
- ✅ Resource already exists (409)
- ✅ Resource deleted/archived
- ✅ Resource in different states (pending, active, completed)

### Validation Errors

- ✅ Missing required fields (400)
- ✅ Invalid field format (400)
- ✅ Business rule violations (422)
- ✅ Constraint violations (unique, foreign key)

### System Conditions

- ✅ Rate limiting (429)
- ✅ Server errors (500)
- ✅ Service unavailable (503)
- ✅ Timeout scenarios (504)
- ✅ Slow responses (delay > 1000ms)

## Error Handling

Common validation rules:

- Method must be: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- Endpoint must start with `/`
- Status codes must be valid HTTP codes (100-599)
- Headers should be valid HTTP header names
- Body can be any valid YAML/JSON structure

## Integration with OpenAPI

When processing OpenAPI specifications:

1. Extract each path and operation
2. Parse parameter schemas for realistic data generation
3. Use response schemas to structure the body
4. Include all documented response codes as separate rules
5. Extract descriptions and summaries for documentation

## Template Variables

When using templates, replace the following placeholders:

- `{{API_NAME}}`: The display name of the API
- `{{API_DESCRIPTION}}`: Chinese description of the API
- `{{HTTP_METHOD}}`: GET, POST, PUT, DELETE, etc.
- `{{ENDPOINT_PATH}}`: API endpoint path
- `{{RESOURCE_NAME}}`: Resource name (e.g., "User", "Order", "Product")
- `{{RESOURCE_NAME_CN}}`: Chinese resource name (e.g., "用户", "订单", "产品")
- `{{RESOURCE_PATH}}`: Resource path segment (e.g., "users", "orders")
- `{{SUCCESS_BODY}}`: Success response body
- `{{COLLECTION_ITEMS}}`: Array of items for collection endpoints
- `{{RESOURCE_BODY}}`: Single resource object
- `{{CREATED_ID}}`: ID of newly created resource
- `{{VALIDATION_ERRORS}}`: Validation error details
- `{{BUSINESS_RULE_ERROR}}`: Business rule violation message
- `{{DEPENDENCIES}}`: Dependent resources that prevent deletion

## Notes

- All files are created in the `.mock/` directory at the project root
- The mock server will automatically reload when files are created/modified
- Chinese descriptions are preferred for the `name` and `description` fields (both API level and rule level)
- Use proper YAML indentation (2 spaces)
- Templates are guidelines - always customize based on specific API requirements
- **📚 Complete Examples**: Refer to **[examples.md](examples.md)** for complete, real-world examples showing comprehensive edge case coverage
- **📁 Template Files**: Browse **[templates/](templates/)** directory for all available templates
