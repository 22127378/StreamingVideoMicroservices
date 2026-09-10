# 🗄️ StreamForge Database Architecture & Schema Documentation

> **Hệ quản trị cơ sở dữ liệu**: Amazon DynamoDB (Serverless NoSQL Key-Value & Document Database)  
> **Mô hình kiến trúc**: Cloud-Native Distributed Microservices on AWS EKS  
> **Cơ chế mã hóa**: AWS KMS Customer Managed Key (CMK) Serverless Encryption-at-Rest  
> **Cơ chế sao lưu**: Point-In-Time Recovery (PITR) Enabled  
> **Chế độ tính cước**: `PAY_PER_REQUEST` (On-Demand Capacity Autoscaling)

---

## 📑 Mục lục
1. [Sơ đồ Quan hệ Thực thể (Entity Relationship Diagram - ERD)](#1-sơ-đồ-quan-hệ-thực-thể-erd)
2. [Chi tiết các Bảng Dữ liệu Nghiệp vụ (Application Tables)](#2-chi-tiết-các-bảng-dữ-liệu-nghiệp-vụ)
   - [2.1. Bảng `StreamForge_Users`](#21-bảng-streamforge_users)
   - [2.2. Bảng `StreamForge_Channels`](#22-bảng-streamforge_channels)
   - [2.3. Bảng `StreamForge_Streams`](#23-bảng-streamforge_streams)
   - [2.4. Bảng `StreamForge_Follows`](#24-bảng-streamforge_follows)
3. [Bảng Quản trị Hạ tầng (Infrastructure Lock Table)](#3-bảng-quản-trị-hạ-tầng)
   - [3.1. Bảng `StreamForge-tf-state-locks`](#31-bảng-streamforge-tf-state-locks)
4. [Mô hình Truy vấn & Access Patterns](#4-mô-hình-truy-vấn--access-patterns)
5. [Cấu hình Bảo mật, Encryption & Khắc phục sự cố](#5-cấu-hình-bảo-mật--encryption)

---

## 1. Sơ đồ Quan hệ Thực thể (ERD)

```mermaid
erDiagram
    USERS ||--o{ CHANNELS : "owns / creates (1:1)"
    USERS ||--o{ FOLLOWS : "follows (1:N)"
    CHANNELS ||--o{ FOLLOWS : "followed_by (1:N)"
    CHANNELS ||--o{ STREAMS : "broadcasts / publishes (1:N)"

    USERS {
        string user_id PK "Unique User Identifier (usr_xxx)"
        string email UK "User Email Address (GSI: email-index)"
        string username UK "User Unique Handle (GSI: username-index)"
        string display_name "Full Display Name"
        string password_hash "Bcrypt Salted Hash"
        string avatar_url "Profile Avatar CDN URL"
        string role "user | admin | moderator"
        string stream_key "Secret RTMP Publishing Token"
        string created_at "ISO-8601 Timestamp"
        string updated_at "ISO-8601 Timestamp"
    }

    CHANNELS {
        string channel_id PK "Unique Channel Identifier (chn_xxx)"
        string streamer_id FK "Owner User ID (GSI: streamer_id-index)"
        string streamer_name "Streamer Display Name"
        string streamer_username "Streamer Username Handle"
        string streamer_avatar "Streamer Avatar URL"
        string title "Current Stream / Channel Title"
        string category "Live Category (GSI: category-index)"
        list tags "List of String Tags (FPS, Chill, etc.)"
        string is_live "Live Status: 'true' | 'false' (GSI: is_live-index)"
        number viewer_count "Current Concurrent Live Viewers"
        number follower_count "Total Number of Followers"
        string stream_key "Active Stream Ingestion Key"
        string playback_url "Master HLS Playback URL"
        string created_at "ISO-8601 Timestamp"
        string updated_at "ISO-8601 Timestamp"
    }

    STREAMS {
        string stream_id PK "Unique Stream / VOD ID (vod_xxx)"
        string channel_id FK "Associated Channel ID (GSI: channel_id-index)"
        string uploader_id FK "Owner Streamer User ID"
        string uploader_name "Streamer Display Name"
        string title "VOD / Broadcast Title"
        string raw_s3_key "Source S3 Raw Media Key"
        string status "PROCESSING | READY | FAILED | LIVE (GSI: status-index)"
        boolean is_vip_only "VIP Tier-gated Flag (Signed Cookies Required)"
        string playback_url "CloudFront CDN HLS Master Playlist URL"
        string thumbnail_url "CloudFront CDN Thumbnail Image URL"
        list profiles_available "Available ABR Profiles [1080p60, 720p60, 480p, 360p]"
        number duration_seconds "Total Video Duration"
        number views_count "Total VOD View Count"
        string processing_started_at "Transcoder Start Time"
        string completed_at "Transcoder Completion Time"
        string failed_at "Error Timestamp if FAILED"
        string error_message "Transcoder Error Details"
        string created_at "ISO-8601 Timestamp"
        string updated_at "ISO-8601 Timestamp"
    }

    FOLLOWS {
        string user_id PK "User ID who follows"
        string channel_id SK "Channel ID being followed (GSI: channel_id-user_id-index)"
        string followed_at "ISO-8601 Timestamp"
    }
```

---

## 2. Chi tiết các Bảng Dữ liệu Nghiệp vụ

### 2.1. Bảng `StreamForge_Users`
- **Mục đích**: Quản lý định danh người dùng, thông tin xác thực tài khoản, phân quyền và Stream Key bảo mật.
- **Khóa chính (Primary Key)**:
  - **Partition Key (Hash Key)**: `user_id` (String)
- **Chỉ mục phụ toàn cục (Global Secondary Indexes - GSI)**:

| Tên Chỉ mục (GSI) | Partition Key | Sort Key | Projection | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| `email-index` | `email` (S) | *None* | `ALL` | Đăng nhập bằng Email, xác thực trùng lặp khi đăng ký |
| `username-index` | `username` (S) | *None* | `ALL` | Đăng nhập bằng Username, tra cứu thông tin trang cá nhân |

- **Thuộc tính & Kiểu dữ liệu**:

| Thuộc tính (Attribute) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `user_id` | `String` | Có | Định danh duy nhất của người dùng (`usr_xxxxxxxx`) |
| `email` | `String` | Có | Địa chỉ email (được chuẩn hóa chữ thường) |
| `username` | `String` | Có | Tên tài khoản định danh duy nhất (chữ thường) |
| `display_name` | `String` | Có | Tên hiển thị công khai trên giao diện/chat |
| `password_hash` | `String` | Có | Chuỗi băm mật khẩu mã hóa an toàn bằng `Bcrypt` (Salt rounds = 10) |
| `avatar_url` | `String` | Không | Đường dẫn ảnh đại diện CDN của người dùng |
| `role` | `String` | Có | Vai trò người dùng (`user`, `admin`, `moderator`) |
| `stream_key` | `String` | Có | Khóa bí mật phục vụ phát sóng RTMP từ OBS (`live_xxxxxxxx`) |
| `created_at` | `String` | Có | Thời gian tạo tài khoản (ISO-8601) |
| `updated_at` | `String` | Có | Thời gian cập nhật tài khoản gần nhất (ISO-8601) |

---

### 2.2. Bảng `StreamForge_Channels`
- **Mục đích**: Quản lý phòng livestream của streamer, trạng thái phát sóng trực tiếp, danh mục chủ đề, số lượng người xem và lượt theo dõi.
- **Khóa chính (Primary Key)**:
  - **Partition Key (Hash Key)**: `channel_id` (String)
- **Chỉ mục phụ toàn cục (Global Secondary Indexes - GSI)**:

| Tên Chỉ mục (GSI) | Partition Key | Sort Key | Projection | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| `streamer_id-index` | `streamer_id` (S) | *None* | `ALL` | Truy vấn kênh stream thuộc quyền sở hữu của một User |
| `is_live-index` | `is_live` (S) | *None* | `ALL` | Lấy danh sách toàn bộ các kênh **Đang Trực Tiếp (`true`)** |
| `category-index` | `category` (S) | *None* | `ALL` | Khám phá các luồng phát theo danh mục (Valorant, Just Chatting,...) |

- **Thuộc tính & Kiểu dữ liệu**:

| Thuộc tính (Attribute) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `channel_id` | `String` | Có | Định danh duy nhất của kênh stream (`chn_xxxxxxxx`) |
| `streamer_id` | `String` | Có | Mã người dùng sở hữu kênh (`usr_xxxxxxxx`) |
| `streamer_name` | `String` | Có | Tên hiển thị của streamer |
| `streamer_username`| `String` | Có | Username của streamer |
| `streamer_avatar` | `String` | Không | Link ảnh đại diện streamer |
| `title` | `String` | Có | Tiêu đề buổi phát sóng trực tiếp |
| `category` | `String` | Có | Danh mục nội dung phát sóng (vd: `Valorant`, `Software & Game Dev`) |
| `tags` | `List<String>`| Không | Mảng các nhãn phân loại (vd: `["FPS", "Esports", "Tiếng Việt"]`) |
| `is_live` | `String` | Có | Trạng thái phát trực tiếp (`"true"` hoặc `"false"`) |
| `viewer_count` | `Number` | Có | Số lượng khán giả đang xem đồng thời |
| `follower_count` | `Number` | Có | Tổng số người theo dõi kênh |
| `stream_key` | `String` | Có | Khóa phát sóng RTMP liên kết với kênh |
| `playback_url` | `String` | Có | Đường dẫn phát sóng HLS trực tiếp từ CDN CloudFront |
| `created_at` | `String` | Có | Thời điểm khởi tạo kênh |
| `updated_at` | `String` | Có | Thời điểm cập nhật trạng thái kênh gần nhất |

---

### 2.3. Bảng `StreamForge_Streams`
- **Mục đích**: Lưu trữ thông tin metadata của các phiên livestream đã lưu trữ (VODs) và tiến trình chuyển mã video tự động đa luồng (Adaptive Bitrate Transcoding Pipeline).
- **Khóa chính (Primary Key)**:
  - **Partition Key (Hash Key)**: `stream_id` (String)
- **Chỉ mục phụ toàn cục (Global Secondary Indexes - GSI)**:

| Tên Chỉ mục (GSI) | Partition Key | Sort Key | Projection | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| `channel_id-index` | `channel_id` (S) | *None* | `ALL` | Lấy danh sách video VODs thuộc về một kênh cụ thể |
| `status-index` | `status` (S) | *None* | `ALL` | Lọc video theo trạng thái xử lý (`READY`, `PROCESSING`, `FAILED`) |

- **Thuộc tính & Kiểu dữ liệu**:

| Thuộc tính (Attribute) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `stream_id` | `String` | Có | Định danh duy nhất của video/luồng (`vod_xxxxxxxx`) |
| `channel_id` | `String` | Có | Định danh kênh phát hành video |
| `uploader_id` | `String` | Có | Mã người dùng tải lên/phát sóng |
| `uploader_name` | `String` | Có | Tên hiển thị người tải lên |
| `title` | `String` | Có | Tiêu đề video / buổi phát sóng |
| `raw_s3_key` | `String` | Có | Đường dẫn file MP4 gốc trong S3 Raw Media Bucket |
| `status` | `String` | Có | Trạng thái: `PROCESSING` (Đang nén) ➔ `READY` (Sẵn sàng phát) / `FAILED` |
| `is_vip_only` | `Boolean` | Có | Phân quyền: Yêu cầu CloudFront Signed Cookies nếu là nội dung VIP |
| `playback_url` | `String` | Không | Link phát Master Playlist HLS (`master.m3u8`) qua CloudFront CDN |
| `thumbnail_url` | `String` | Không | Link ảnh bìa đại diện được FFmpeg tự động trích xuất |
| `profiles_available`| `List<String>`| Không | Các độ phân giải sẵn sàng (vd: `["1080p60", "720p60", "480p", "360p"]`) |
| `duration_seconds` | `Number` | Không | Thời lượng tổng thể của video (tính bằng giây) |
| `views_count` | `Number` | Không | Lượt xem tích lũy của video VOD |
| `processing_started_at`| `String` | Không | Thời điểm Worker bắt đầu xử lý chuyển mã |
| `completed_at` | `String` | Không | Thời điểm hoàn tất nén và đóng gói HLS |
| `failed_at` | `String` | Không | Thời điểm xảy ra lỗi (nếu có) |
| `error_message` | `String` | Không | Thông tin chi tiết lỗi chuyển mã |
| `created_at` | `String` | Có | Thời gian tạo bản ghi |
| `updated_at` | `String` | Có | Thời gian cập nhật bản ghi gần nhất |

---

### 2.4. Bảng `StreamForge_Follows`
- **Mục đích**: Quản lý mối quan hệ Theo dõi (Follow / Unfollow) nhiều-nhiều (N:N) giữa Người dùng và Kênh Stream.
- **Khóa chính kết hợp (Composite Primary Key)**:
  - **Partition Key (Hash Key)**: `user_id` (String)
  - **Sort Key (Range Key)**: `channel_id` (String)
- **Chỉ mục phụ toàn cục (Global Secondary Indexes - GSI)**:

| Tên Chỉ mục (GSI) | Partition Key | Sort Key | Projection | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| `channel_id-user_id-index` | `channel_id` (S) | `user_id` (S) | `ALL` | Truy vấn danh sách người dùng đang theo dõi một kênh stream |

- **Thuộc tính & Kiểu dữ liệu**:

| Thuộc tính (Attribute) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `user_id` | `String` | Có | Mã người dùng thực hiện theo dõi (`usr_xxxxxxxx`) |
| `channel_id` | `String` | Có | Mã kênh stream được theo dõi (`chn_xxxxxxxx`) |
| `followed_at` | `String` | Có | Thời điểm bắt đầu theo dõi (ISO-8601) |

---

## 3. Bảng Quản trị Hạ tầng

### 3.1. Bảng `StreamForge-tf-state-locks`
- **Mục đích**: Đảm bảo an toàn đồng thời (State Concurrency Locking) cho Terraform khi triển khai hạ tầng Infrastructure as Code (IaC) tự động qua CI/CD.
- **Khóa chính**:
  - **Partition Key (Hash Key)**: `LockID` (String)
- **Cấu hình**:
  - Mã hóa KMS CMK: `alias/StreamForge-tf-state`
  - PITR Backup: Đã kích hoạt
  - Billing Mode: `PAY_PER_REQUEST`

---

## 4. Mô hình Truy vấn & Access Patterns

Hệ thống được thiết kế tối ưu hóa 100% cho các truy vấn O(1) và O(log N) bằng Partition Key và GSI, loại bỏ hoàn toàn các thao tác Full Table Scan tốn kém:

| Chức năng Nghiệp vụ | Bảng mục tiêu | Kiểu truy vấn | Key Condition / Index | Độ phức tạp |
| :--- | :--- | :--- | :--- | :--- |
| **Đăng nhập bằng Email** | `StreamForge_Users` | `Query` | `email-index` (`email = :email`) | **O(1)** |
| **Đăng nhập bằng Username** | `StreamForge_Users` | `Query` | `username-index` (`username = :username`) | **O(1)** |
| **Lấy Profile theo User ID** | `StreamForge_Users` | `GetItem` | `user_id = :userId` | **O(1)** |
| **Lấy Kênh của Streamer** | `StreamForge_Channels` | `Query` | `streamer_id-index` (`streamer_id = :sId`) | **O(1)** |
| **Danh sách Kênh Đang Live** | `StreamForge_Channels` | `Query` | `is_live-index` (`is_live = 'true'`) | **O(log N)** |
| **Duyệt Kênh theo Game/Category**| `StreamForge_Channels` | `Query` | `category-index` (`category = :cat`) | **O(log N)** |
| **Kiểm tra trạng thái Follow** | `StreamForge_Follows` | `GetItem` | `user_id = :uId AND channel_id = :cId` | **O(1)** |
| **Theo dõi / Bỏ theo dõi** | `StreamForge_Follows` | `PutItem` / `DeleteItem` | `user_id = :uId, channel_id = :cId` | **O(1)** |
| **Lấy VODs của Kênh** | `StreamForge_Streams` | `Query` | `channel_id-index` (`channel_id = :cId`) | **O(log N)** |
| **Worker cập nhật trạng thái VOD**| `StreamForge_Streams` | `UpdateItem` | `stream_id = :sId` | **O(1)** |

---

## 5. Cấu hình Bảo mật, Encryption & Tự động hóa

1. **Bảo mật & Phân quyền IAM (IRSA Least Privilege)**:
   - Pod Backend API và Transcoder Worker trên AWS EKS kết nối với DynamoDB thông qua **IAM Roles for Service Accounts (IRSA)**, tuyệt đối không sử dụng Access Key tĩnh.
2. **Mã hóa Dữ liệu (Zero-Trust Security)**:
   - **Encryption at Rest**: Toàn bộ bảng DynamoDB được mã hóa bằng khóa riêng **AWS KMS Customer Managed Key (CMK)** với chu kỳ tự động xoay vòng khóa (Annual Key Rotation).
   - **Encryption in Transit**: Mọi kết nối trao đổi dữ liệu với DynamoDB đều được mã hóa TLS 1.3 qua AWS PrivateLink / VPC Endpoints.
3. **Phục hồi Thảm họa (Disaster Recovery & Data Protection)**:
   - Kích hoạt **Point-in-Time Recovery (PITR)** liên tục trên tất cả các bảng dữ liệu, cho phép phục hồi trạng thái dữ liệu chính xác đến từng giây trong vòng 35 ngày gần nhất.
4. **Vị trí Mã Nguồn Cấu hình Database**:
   - **Mã nguồn Terraform IaC**: [`terraform/modules/05-dynamodb/main.tf`](file:///c:/Users/Admin/Desktop/StreamingVideo/terraform/modules/05-dynamodb/main.tf)
   - **Mã nguồn Backend Service (Node.js SDK v3)**: [`src/api/src/services/dynamoService.js`](file:///c:/Users/Admin/Desktop/StreamingVideo/src/api/src/services/dynamoService.js)
   - **Mã nguồn Worker Transcoder**: [`src/transcoder-worker/src/worker.js`](file:///c:/Users/Admin/Desktop/StreamingVideo/src/transcoder-worker/src/worker.js)
