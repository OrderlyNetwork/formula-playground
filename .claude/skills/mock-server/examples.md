# Mock API Generation Examples

## Example 1: From Natural Language

**User Input:**

```
Create a mock for getting a list of products. It should return an array of products with id, name, price, and stock fields.
```

**Generated File:** `.mock/get_products.yaml`

```yaml
name: Get Products List
description: 获取产品列表
method: GET
endpoint: /api/products
rules:
  - name: 正常返回
    status: 200
    headers:
      Content-Type: application/json
    body:
      - id: 1
        name: Product A
        price: 99.99
        stock: 100
      - id: 2
        name: Product B
        price: 149.99
        stock: 50
    delay: 0

  - name: 空列表
    status: 200
    headers:
      Content-Type: application/json
    body: []
    delay: 0

  - name: 服务器错误
    status: 500
    headers:
      Content-Type: application/json
    body:
      error: Internal Server Error
      message: Database connection failed
    delay: 0
```

---

## Example 2: From TypeScript Interface

**User Input:**

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  role: "admin" | "user";
  createdAt: string;
}

// Create a POST endpoint to create a user
```

**Generated File:** `.mock/create_user.yaml`

```yaml
name: Create User
description: 创建新用户
method: POST
endpoint: /api/users
rules:
  - name: 创建成功
    status: 201
    headers:
      Content-Type: application/json
    body:
      id: 123
      username: newuser
      email: newuser@example.com
      avatar: https://example.com/avatar.jpg
      role: user
      createdAt: "2025-11-20T10:30:00Z"
    delay: 0

  - name: 用户名已存在
    status: 409
    headers:
      Content-Type: application/json
    body:
      error: Username already exists
      code: DUPLICATE_USERNAME
    delay: 0

  - name: 验证失败
    status: 400
    headers:
      Content-Type: application/json
    body:
      error: Validation failed
      fields:
        email: Invalid email format
    delay: 0

  - name: 未授权
    status: 401
    headers:
      Content-Type: application/json
    body:
      error: Unauthorized
      message: Valid authentication token required
    delay: 0
```

---

## Example 3: From OpenAPI Spec

**User Input:**

```yaml
paths:
  /api/orders/{orderId}:
    get:
      summary: Get order by ID
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  status:
                    type: string
                    enum: [pending, completed, cancelled]
                  total:
                    type: number
```

**Generated File:** `.mock/get_order.yaml`

```yaml
name: Get Order by ID
description: 根据订单ID获取订单详情
method: GET
endpoint: /api/orders/:orderId
rules:
  - name: 订单存在
    status: 200
    headers:
      Content-Type: application/json
    body:
      id: "ORD-2025-001"
      status: completed
      total: 299.99
    delay: 0

  - name: 订单不存在
    status: 404
    headers:
      Content-Type: application/json
    body:
      error: Order not found
      code: 404
    delay: 0

  - name: 未授权访问
    status: 403
    headers:
      Content-Type: application/json
    body:
      error: Forbidden
      message: You don't have permission to access this order
    delay: 0

  - name: 订单处理中
    status: 200
    headers:
      Content-Type: application/json
    body:
      id: "ORD-2025-002"
      status: pending
      total: 599.50
    delay: 0
```

---

## Example 4: Comprehensive Edge Cases - User Login

**User Input:**

```
Create a login endpoint that accepts email and password
```

**Generated File:** `.mock/login.yaml`

```yaml
name: User Login
description: 用户登录接口
method: POST
endpoint: /api/auth/login
rules:
  - name: 登录成功
    status: 200
    headers:
      Content-Type: application/json
    body:
      token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      user:
        id: 1
        email: user@example.com
        username: johndoe
      expiresIn: 3600
    delay: 0

  - name: 密码错误
    status: 401
    headers:
      Content-Type: application/json
    body:
      error: Invalid credentials
      message: Email or password is incorrect
    delay: 0

  - name: 用户不存在
    status: 404
    headers:
      Content-Type: application/json
    body:
      error: User not found
      message: No account found with this email
    delay: 0

  - name: 账户被锁定
    status: 403
    headers:
      Content-Type: application/json
    body:
      error: Account locked
      message: Too many failed login attempts. Please try again in 30 minutes
      retryAfter: 1800
    delay: 0

  - name: 缺少必填字段
    status: 400
    headers:
      Content-Type: application/json
    body:
      error: Bad request
      message: Missing required fields
      fields:
        - email
        - password
    delay: 0

  - name: 邮箱格式错误
    status: 400
    headers:
      Content-Type: application/json
    body:
      error: Validation failed
      message: Invalid email format
    delay: 0

  - name: 服务器错误
    status: 500
    headers:
      Content-Type: application/json
    body:
      error: Internal server error
      message: An unexpected error occurred
    delay: 0

  - name: 慢速响应
    status: 200
    headers:
      Content-Type: application/json
    body:
      token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      user:
        id: 1
        email: user@example.com
        username: johndoe
      expiresIn: 3600
    delay: 2000
```

---

## Example 5: Collection with Pagination

**User Input:**

```
Create a GET endpoint for fetching posts with pagination
```

**Generated File:** `.mock/get_posts.yaml`

```yaml
name: Get Posts
description: 获取文章列表（分页）
method: GET
endpoint: /api/posts
rules:
  - name: 第一页数据
    status: 200
    headers:
      Content-Type: application/json
      X-Total-Count: "100"
      X-Page: "1"
      X-Per-Page: "10"
    body:
      data:
        - id: 1
          title: First Post
          content: Content here...
          author: John Doe
          createdAt: "2025-11-01T10:00:00Z"
        - id: 2
          title: Second Post
          content: More content...
          author: Jane Smith
          createdAt: "2025-11-02T10:00:00Z"
      pagination:
        page: 1
        perPage: 10
        total: 100
        totalPages: 10
    delay: 0

  - name: 空结果
    status: 200
    headers:
      Content-Type: application/json
      X-Total-Count: "0"
    body:
      data: []
      pagination:
        page: 1
        perPage: 10
        total: 0
        totalPages: 0
    delay: 0

  - name: 页码超出范围
    status: 400
    headers:
      Content-Type: application/json
    body:
      error: Invalid page number
      message: Page number exceeds total pages
    delay: 0

  - name: 无效参数
    status: 400
    headers:
      Content-Type: application/json
    body:
      error: Invalid parameters
      message: perPage must be between 1 and 100
    delay: 0
```

---

## Example 6: File Upload

**User Input:**

```
Create a file upload endpoint for images
```

**Generated File:** `.mock/upload_image.yaml`

```yaml
name: Upload Image
description: 上传图片文件
method: POST
endpoint: /api/upload/image
rules:
  - name: 上传成功
    status: 201
    headers:
      Content-Type: application/json
    body:
      id: img_abc123
      url: https://cdn.example.com/images/abc123.jpg
      size: 1048576
      mimeType: image/jpeg
      width: 1920
      height: 1080
    delay: 500

  - name: 文件过大
    status: 413
    headers:
      Content-Type: application/json
    body:
      error: File too large
      message: Maximum file size is 5MB
      maxSize: 5242880
    delay: 0

  - name: 不支持的文件类型
    status: 415
    headers:
      Content-Type: application/json
    body:
      error: Unsupported media type
      message: Only JPEG, PNG, and GIF images are allowed
      supportedTypes:
        - image/jpeg
        - image/png
        - image/gif
    delay: 0

  - name: 缺少文件
    status: 400
    headers:
      Content-Type: application/json
    body:
      error: Bad request
      message: No file provided
    delay: 0

  - name: 存储空间不足
    status: 507
    headers:
      Content-Type: application/json
    body:
      error: Insufficient storage
      message: Upload quota exceeded
    delay: 0
```
