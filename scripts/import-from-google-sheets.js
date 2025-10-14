#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to parse Google Sheets data
function parseGoogleSheetsData(data) {
  const rows = data.split('\n');
  const headers = rows[0].split('\t').map(h => h.trim());
  const tasks = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].trim()) {
      const values = rows[i].split('\t');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : '';
      });
      tasks.push(row);
    }
  }
  
  return tasks;
}

// Function to map Google Sheets data to database structure
function mapTaskData(csvRow, index) {
  // Truncate long task names to fit database constraints
  const taskName = csvRow['Tên công việc'] || '';
  const truncatedTaskName = taskName.length > 500 ? taskName.substring(0, 497) + '...' : taskName;
  
  // Use original task ID if it exists and is valid
  let taskId = csvRow['ID'] || '';
  if (!taskId || taskId.length > 50) {
    taskId = `TASK-${String(index + 1).padStart(4, '0')}`;
  }
  
  // Clean up assignee field (remove extra spaces, handle multiple assignees)
  let assignee = csvRow['Người phụ trách'] || '';
  if (assignee.includes(',')) {
    assignee = assignee.split(',')[0].trim(); // Take first assignee
  }
  
  // Clean up status field
  let status = csvRow['Trạng thái'] || 'Pending';
  if (status === 'In Progress') status = 'In Progress';
  if (status === 'Done') status = 'Done';
  if (status === 'Pending') status = 'Pending';
  
  return {
    task_id: taskId,
    task_name: truncatedTaskName,
    assignee: assignee,
    status: status,
    priority: csvRow['Priority'] || 'Medium',
    deadline: csvRow['Deadline'] || null,
    description: csvRow['Link mô tả'] || '',
    notes: csvRow['Ghi chú'] || '',
    link_description: csvRow['Link mô tả'] || '',
    okr_related: csvRow['OKR liên quan'] || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Function to determine project based on task name
function determineProject(taskName) {
  const projectMappings = {
    'Web/App': 'WEB-APP',
    'App': 'WEB-APP',
    'Web': 'WEB-APP',
    'Ưu Đãi': 'PROMO',
    'Voucher': 'VOUCHER',
    'Săn Voucher': 'VOUCHER',
    'Tracking': 'TRACKING',
    'Gom đơn': 'TRACKING',
    'Payment': 'PAYMENT',
    'Thanh toán': 'PAYMENT',
    'PMH': 'PAYMENT',
    'Game': 'GAME',
    'Vòng quay': 'GAME',
    'LDP': 'GAME',
    'Hội thảo': 'EVENT',
    'Campaign': 'CAMPAIGN',
    'Khuyến mãi': 'CAMPAIGN',
    'Flashsale': 'CAMPAIGN',
    'Recommend': 'WEB-APP',
    'Nâng cấp': 'WEB-APP',
    'Chính sách': 'WEB-APP',
    'Popup': 'WEB-APP',
    'PIM': 'WEB-APP',
    'Sản phẩm': 'WEB-APP'
  };
  
  for (const [keyword, projectCode] of Object.entries(projectMappings)) {
    if (taskName.includes(keyword)) {
      return projectCode;
    }
  }
  
  return 'GENERAL'; // Default project for unmatched tasks
}

async function importFromGoogleSheets() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting import from Google Sheets data...');
    
    // Sample data based on the Google Sheets structure you provided
    const sampleData = `ID	Tên công việc	Người phụ trách	Trạng thái	Priority	Deadline	Link mô tả	Ghi chú	OKR liên quan
TASK-0013	Làm kế hoạch triển khai hệ thông tin sản phẩm core mới	Thanh	Done	Medium	31/07/2025	31/07/2025 Có bản test------Cập nhật timeline mới nhatthanh26111312@gmail.com		
TASK-0015	Sáp nhập tỉnh thành	Phúc	Done	High	11/8/2025	https://docs.google.com/document/d/1a4SJVftuxnXc8iCtG5UdbYLt8W-YULX3QWTeCLqze_M/edit?tab=t.0#heading=h.xaqs40d8vw18	11/08/2025 golive Web/App theo core mới	
TASK-0016	[Phase 1] - Nâng cấp mua kèm	Tú	Done	Medium	11/8/2025	https://docs.google.com/document/u/0/?q=mua%20k%C3%A8m		
TASK-0020	Web/App AVAKids mới.	Giang	Done	Emergency	30/8/2025	https://docs.google.com/document/d/1RrsAWpPKN3OznBnuBHiGtDVzGgYIvJvb6fLrP5WO2eQ/edit?tab=t.0	Cập nhật timeline mới giangnguy1310@gmail.com	
TASK-0021	Chương trình Ưu Đãi Nội Bộ.	Giang	Pending	High	15/10/2025	Listing timeline: https://docs.google.com/spreadsheets/d/1NxsVpgOlAtZhRkX53n2TJpR4-vBAvtgIcpLwk9f0QQ0/edit?gid=0#gid=0----15/09/2025 GoliveCheck lại quy trình với kinh doanh giangnguy1310@gmail.com-----Thay đổi lại concept- Concept: https://docs.google.com/spreadsheets/d/1rCxxZNuosNpuTogpd-c1pVkVdYejLQqA8FswqQJVXwg/edit?usp=sharing- Thiết kế: https://www.figma.com/design/HTsnDyshmuuXQfxSMIeE0l/%C6%AFu-%C4%90%C3%A3i-N%E1%BB%99i-B%E1%BB%99?node-id=1-1539&p=f&t=2hCKjtvszO5hsm3D-0		
TASK-0022	ProposalChương trình Săn Voucher	Luân, Như	Done	Emergency	26/08/2025	https://docs.google.com/spreadsheets/d/1LrKhcHJiuCJd4sEPTE9JRkkcqYixaNx7o3tnwBzPmek/edit?usp=sharing	ProposealInitial deadline: 21/07,Update deadline: 24/07Update deadline: 28/0706/08 13/8 rehearsal	
TASK-0019	Chương trình bán hàng cận date	Phúc	Pending	Low	15/09/2025		
TASK-0023	Recommend Web/App.	Tú	Done	Medium	15/08/2025	https://www.figma.com/proto/MXWl373fNr9c8Qd1HlIHFg/G%E1%BB%A3i-%C3%BD-s%E1%BA%A3n-ph%E1%BA%A9m-%7C-Personalize?page-id=0%3A1&node-id=37-3&p=f&viewport=28%2C399%2C0.23&t=NFwuw1XtAcxxqIIl-1&scaling=min-zoom&content-scaling=fixed	24/07/2025 Golive ngữ cảnh gợi ý cho bạnlink test data : https://docs.google.com/spreadsheets/d/1_A4W38aLwkhMzlFlbdhbbMQIdDGkp1IadB3hKLGQ2N8/edit?gid=1670124162#gid=1670124162	
TASK-0024	Khuyến mãi khu vực và nền tảng Web/App.	Phúc	Done	Emergency	29/09/2025	https://docs.google.com/document/d/1S3jUpFlakgYTdcA5Bpki3hoCEoNOPjEGZ16huKJZJzI/edit?tab=t.0	29/09/2025 Golive	
TASK-0025	Nâng cấp chính sách giao khu vực Hà Nội.	Phúc	Done	High	18/07/2025		Golived	
TASK-0026	Gom đơn	Phúc	In Progress	Emergency	07/10/2025	https://docs.google.com/document/d/1xEKaEvBqvKaDE_hINjdBJdtr87ku0HPOjzElJYgJBNQ/edit?tab=t.0#heading=h.lkkb7mrn62o		
TASK-0027	[Phase 1] - Quy hoạch tracking	Tú, Thanh	Done	Low	31/07/2025	https://docs.google.com/spreadsheets/d/1Q8C79CyeuEEMvY4sIhsLH15o74XSOhTfF1Rmkxv_A3Q/edit?gid=77716891#gid=77716891	Đã gửi mô tả cho IT, timline golive vào 11/8	
TASK-0028	[Phase 2] - Nâng cấp mua kèm.	Tú	In Progress	High	15/10/2025		Cập nhật ngữ cảnh mua kèm ở ô sản phẩm & Flashsale30/09 được add sprint thành công	
TASK-0018	Phát coupon khách hàng khu vực Hà Nội	Tú	Done	Medium	28/07/2025	https://docs.google.com/spreadsheets/d/15zDYMSk_TLk-HSBU8aPJ6pnCUWk_BP5f0F5mq7dM7gg/edit?gid=1731043627#gid=1731043627	- 23/7 gửi cho KH T5 T6 - phát đi 319	
TASK-0017	Game Web/App	Luân	Pending	Medium	15/09/2025		01/08/2025 Gửi lại thiết kê + mô tả của 3 game hiện có+ Update deadline: 15/8/2025--------+ Update deadline: 15/09/2025Update 25/08/2025: gom về làm chung với Gamehub	
TASK-0051	Nghiệm thu Web/App	Giang	Done	High	11/08/2025	https://docs.google.com/spreadsheets/d/1QBr6h2MoEOFulMTcFZAN2ONvnvCLbP0NaiZBbvpgR8w/edit?gid=0#gid=0	- Đang test web/app dự kiến timeline 6/8 hoàn thành	
TASK-0030	Phân tích tỉ lệ hủy đơn	Tú	Done	Low	28/07/2025	https://lookerstudio.google.com/u/0/reporting/bedadcf1-ac67-42fd-a6f7-9672b7a08ff1/page/4JaSF	https://lookerstudio.google.com/reporting/bedadcf1-ac67-42fd-a6f7-9672b7a08ff1	
TASK-0031	Danh sách SKU thiếu hàng tại HN	Tú	Done	Low	22/07/2025		Chưa thấy đơn hàng có nhiều SO từ kho Thái Hà + KHo khác 	
TASK-0032	Gộp biến thể code combo vào modal	Thanh	In Progress	Medium	30/09/2015		30/09/2025 Golive	
TASK-0033	Quy chuẩn hệ thống hiển thị label	Giang	Done	Medium	15/09/2025		Golive: 15/9Test sớm để live	
TASK-0034	LDP Hội thảo tiền sản	Luân	Done	Low	06/08/2025	https://www.figma.com/design/bE6GBrH3jyHcY6ghHidIgD/Thang-7-2025?node-id=0-1&t=rWdPDu60QtZ9WXab-1	25/7: Gửi wireframe và sơ bộ chức năng IT và PTBH29/7: Gửi IT design form đăng ký --> Đã gửiUpdate URL luôn nha Bảo: https://www.avakids.com/hoi-thao-tien-sanIT báo thì 6/8 này lên dc web thôi nha. App thì Bảo để bạn tính rồi báo lại	
TASK-0035	Tracking gom đơn	Tú	Pending	Low	1/9/2025		Mục tiêu:- Report tỉ lệ gom đơn trước và sau khi golive tính năng Gom Đơn 1 Lần Giaokhi nào gom đơn xong thì làm	
TASK-0036	Gửi PMH thêm cho KH Hà Nội tháng 1,2,3,4	Tú	Done	Low	1/8/2025	https://docs.google.com/spreadsheets/d/1V2E65CZLu_EpXrwyoRU6mxBvuMeBWgARRrPnlX_2nkI/edit?gid=541507081#gid=541507081	Đã gửi 31/07 . SL 245 : https://docs.google.com/spreadsheets/d/1V2E65CZLu_EpXrwyoRU6mxBvuMeBWgARRrPnlX_2nkI/edit?gid=541507081#gid=541507081-----Cần bổ sung report leanhtu104@gmail.com	
TASK-0037	Campaign Khảo Sát của Pediasure	Phúc	Done	Low	08/09/2025	https://docs.google.com/document/d/1SynzFf-ZzvbLBZmJ7e7IFTggQkOQNvzSmINw-yiAtzc/edit?tab=t.0#heading=h.xaqs40d8vw18	28/08/2025: Golive Web08/09/2025: Golive App	
TASK-0038	Mô tả popup cho web/app	Giang	Done	Medium	1/8/2025		
TASK-0039	Frame promote Huggies	Giang	Done	Low	11/8/2025		
TASK-0040	Bán hàng Affiliate qua cổng Massoffer cho AVAKids	Phúc	Done	Medium	03/09/2025		03/09/2025: Golive	
TASK-0041	[Phase 2] - Quy hoạch tracking theo OKRs	Thanh, Tú	Done	High	08/09/2025		
TASK-0042	Khảo sát CSKH	Tú, Trâm	In Progress	Medium	30/09/2025		https://www.figma.com/design/9U25x6mUVt5urvPOShz7Q2/Kh%C3%A1o-s%C3%A1t-KH-2025?node-id=1-718&t=hYpYU999i64AWbOl-1- Cập nhật ngày 15/09: đã gửi thông tin cho CSKH review	
TASK-0052	Nâng cấp Notification & đơn hàng siêu thị	Giang	In Progress	High	1/11/2025	https://docs.google.com/spreadsheets/d/1tv-rOjcC7nmlp2P0U8y8JY9z7MlQgtHFKe6O_HGd7QQ/edit?gid=0#gid=0	- Đã triển khai với Dữ liệu KH, CCM, CDP và thông qua- Hiện tại sẽ làm phase 1 (đảm bảo có tool push notify trước), Phase 2 (nâng cấp lên theo personalize)- Mô tả rõ nhu cầu hiện tại và tương lai gửi để CCM xây tool, làm việc với DLKH để build thêm user segments	
TASK-0043	Template mới cho hệ trang CTBH	Tú, Trâm	Done	High	01/09/2025		- 18/8 họp clear vấn đề với BM . https://docs.google.com/spreadsheets/d/1cG-jpLBUdY_zQJ-rH4BEaNrwrNkAJKocYhsiDbC0vYA/edit?gid=0#gid=0	
TASK-0044	Khuyến mãi Flashsale tặng quà đếm suất	Phúc	Not Started	Medium	30/09/2025		
TASK-0045	Luồng tạo đơn SOM	Phúc	Done	High	10/08/2025		Đã hoàn thành nghiệm thu luồng 10/08/2025	
TASK-0046	Filter theo danh mục cấp 1 cho trang Flash sale	Giang	Done	Medium	21/08/2025		
TASK-0047	So sánh thông số kỹ thuật trong trang tin (SEO)	Giang	Not Started	Low	20/09/2025	Mô tả (SE0)	
TASK-0048	Gắn hình OG chia sẻ mạng xã hội	Luân	In Progress	Low	25/09/2025		OG_IMAGE CHO AVAKIDS chia sẻ mạng Xã Hội.docx	
TASK-0053	Phân tích người dùng và hành vi trước và sau golive lúc 16:46 report liên tục trong 2 tháng	Tú	Done	High	03/11/2025		golive 11/8 16h:46	
TASK-0054	Cập nhật quy trình xử lý đơn hàng cho CC	Hưng	Done	Emergency	12/08/2025		- CC đăng nhập bằng tài khoản của mình -> tạo đơn cho khách -> nhập cconline- Đơn hàng treo ở SOM1/ SOM update tính năng sửa tên và SDT người nhận(là KH) - mong muốn 15h ngày 12/08 live- lúc này CC sẽ cần thực hiện 2 bước: đổi CConline thành user và đổi tên và SDT KH trên SOM2/ Khi tạo đơn sẽ có trường hợp khách có PMH cần sử dụng -> CC cần xin OTP của khách để đăng nhập web/app để dùng. (chỗ này xử lý khéo)	
TASK-0055	Kéo review từ shopee về	Thanh	Not Started	Medium	16/10/2025		
TASK-0056	Game lập ô chạy trên LDP	Luân	Done	Low	14/09/2025		19/08: Đã gửi UI demo IT	
TASK-0059	UPDATE CART/ CHECK OUT	Giang	In Progress	High	30/10/2025	https://docs.google.com/document/d/1HWJVbJ5GVWORJwRTROaXVRHRSBXQxz8_3zOI0SKNgYg/edit?tab=t.0	Doing trước 2 tasks- Hiển thị khuyến mãi trong giỏ hàng- Update hiển thị list siêu thị trong giỏ hàng	
TASK-0060	Khuyến mãi tặng quà tổng đơn	Phúc	Not Started	Medium	30/09/2025		
TASK-0061	Tách biến thể trang listing sản phẩm	Thanh	Done	Emergency	20/08/2025		20/8: Đã gửi mô tả cho IT	
TASK-0062	Nâng cấp trực quan giá biến thể	Giang	Done	High	26/08/2025		
TASK-0063	Tách biến thể màu thời trang theo Modal	Thanh	In Progress	Medium	30/09/2025		Chờ order rule map sản phẩm theo model	
TASK-0064	Theme Lễ 02/09	Như	Done	Medium	28/08/2025	https://docs.google.com/document/d/1Gt2PJQIaqszZhlRIRxmuBKqZV9yvX1w4sIs3FREWvuk/edit?tab=t.0		
TASK-0065	Xử lý luồng đăng nhập ở thiết bị khác	Phúc	Not Started	Medium	30/10/2025		30/10/2025 Gửi lại mô tả triển khai	
TASK-0067	Phát PMH cho nội bộ	Tú	Done	Emergency	20/09/2025		1 tháng gửi 2 lầnChạy vào ngày 5 và 20 hàng tháng- Sữa giảm 10% tối đa 100k- Tất cả trừ sữa giảm 15% tối đa 150k- Nhân viên đã có con9/9 có deal- 17/09 review tổng thể chương trình----Cần đội KD đi bài viết trong group tầng phụ để truyền thông thêm	
TASK-0068	Mua kèm cho sản phẩm FS	Tú	In Progress	Medium	15/10/2025		Đã add sprintCập nhật chi tiết ngày ấn định golive15/10: bắt đầu xử lý	
TASK-0069	Dropship	Phúc	In Progress	Medium	08/10/2025		Họp các team liên quan triển khai:https://app.diagrams.net/?src=about#G1dzfwKyVDCehkzGRf0nV3Q18W6NmqLL3v#%7B%22pageId%22%3A%223bnqWzMLOAM8qbCS990s%22%7D	
TASK-0070	Tach sản phẩm Tã	Thanh	Done	High	15/09/2025		
TASK-0071	Nầng cấp Vòng quay may mắn, phát Voucher hiện tại	Luân	Done	Medium	15/09/2025		
TASK-0072	Trượt kênh nhận OTP	Hưng	Done	Emergency	05/09/2025		05/09/2025 Golive	
TASK-0074	Noti nhận voucher KH mới, khi chưa đăng nhập App	Giang	Pending	High		Tăng CR guests thành users	
TASK-0075	Chương trình Săn Voucher	Luân, Như	In Progress	Medium	1/11/2025		Chú ý: Phần Voucher ngành hàng, hãng càng nhiều ràng buộc thì giá trị càng cao19/09/2025: kickoff với BM & KD -> chốt deal và kịch bản30/09/2025: kickoff với IT- Cần hỗ trợ về tính toán chi phí % phát hành cho phù hợp để không ảnh hưởng đến lãi, và dự kiến lãi bao nhiêu khi chạy chương trình này. BM yêu cầu thêm phần này. nhờ team Yến, anh Phúc hỗ trợ xử lý giúp.Recap cuộc họp với KSNB 07/10/2025:- Việc áp dụng PMH NH khi có sản phẩm thuộc NH khác trong giỏ hàng không xử lí được- Offline đang dùng được bằng cách tách đơn cho KH áp dụng PMH- Nếu online xử lí theo hướng tách đơn sẽ có rủi ro phát sinh phí ship	
TASK-0076	Tối ưu thời gian đẩy đơn hàng xuống siêu thị	Hưng	Done	High	06/09/2025		Golive	
TASK-0077	Nâng cấp redirect tự động	Phúc	In Progress	High	06/10/2025	https://docs.google.com/document/d/1fawIvmK1cFKiwMza0hPu0oy9c49Kch7Tve42rPNCPaQ/edit?tab=t.0#heading=h.4dqj3zy63oy5		
TASK-0078	Nâng cấp mua lại sản phẩm trang home	Tú	Pending	Medium	10/09/2025		Chốt lấy luôn đơn hàng hủy	
TASK-0080	Shop in shop - Ràng số lượng sản phẩm hiển thị	Luân	Done	Emergency	4/9/2025	https://docs.google.com/document/d/1_8NoTbEoTOToI_kYgwADPIjoX-6uAoLkd6qVRKGNU5w/edit?tab=t.3m2fvgg6qv8p#heading=h.bxzk54657qto		
TASK-0081	Game VQMM LDP - Qua hệ game mới	Luân	In Progress	High	1/11/2025		Design: https://www.figma.com/design/ojxmhFO5YLXc2Vyk1pg3VU/Minigame-tr%C3%AAn-Avakids---Web-App---H%E1%BB%87-game-m%E1%BB%9Bi?node-id=264-17315	
TASK-0082	SẮP XẾP THỨ TỰ FILTER CATE CẤP 1	Giang	Done	High	19/9/2025	https://docs.google.com/document/d/1ypsB1gKYENj1sc5tCSIsM9dxwbtcpD6JWCvXdP3s/edit?usp=sharing		
TASK-0083	[Phase 2] - Tách biến thể trang NH	Thanh	Done	High	30/9/2025	https://docs.google.com/document/d/1Y5mr7dlb6URyiQCMqZQ3TEu6fP6QL5LGLsDMeQrefA4/edit?tab=t.0		
TASK-0084	Trạng thái sản phẩm AVAKids	Phúc	In Progress	Medium	30/10/2025		
TASK-0085	Mở đánh giá sản phẩm trên web/app	Thanh	In Progress	Medium	01/11/2025		
TASK-0086	Clear hàng tồn kho Hà Nội	Phúc	Pending	Medium	30/9/2025		
TASK-0087	Tối ưu luồng phát PMH	Phúc	In Progress	Medium	09/10/2025		Ngồi lại với team IT đang vận hành để thống nhất lại luồng	
TASK-0088	Gắn tracking Recommend cho App	Tú	In Progress	Medium	30/10/2025		Bảo đang check tracking cho app	
TASK-0089	Cập nhật tính năng tools Search Web/App	Thanh	In Progress	Medium	30/10/2025		
TASK-0090	Bán hàng online only	Phúc	Pending	Low	15/10/2025		Theo định hướng của a Tốt, ngừng chạy Online Only	
TASK-0091	Tạo đơn SOM	Phúc	In Progress	High	15/10/2025		- Dự kiến tuần đầu tiên của tháng 10 sẽ có thể chạy demo- Thời gian PM nghiệm thu trước khi chạy demo: 02/10/2025- Dời timeline vì Tools P.E kẹt tải task Sàn MWG: 15/10/2025	
TASK-0092	Luồng liên kết AccesssTrade	Phúc	In Progress	Medium	15/10/2025		
TASK-0093	Home paylater - Truyền mã lãi suất 0%	Tú	In Progress	Low	16/10/2025	https://docs.google.com/spreadsheets/d/1MwOd4jOAjMe8uOKIpoCFwDvq8tNY7Uzl/edit?rtpof=true&sd=true	Hiện tại home credit ghi nhận đơn home paylater  có lãi suất  >> truyền mã modelname để home creadit nhận biết đơn hàng lãi suất 0%	
TASK-0094	Ví MWG	Tú	In Progress	High	20/10/2025	https://docs.google.com/document/d/1Tlzg2jyLeRWmFBpna6OMwm9BJxEMIeXuBqTGlTE0dEw/edit?tab=t.0		
TASK-0095	Nâng cấp hệ PMH	Phúc	Done	High	07/10/2025		- Đầu tạo PMH theo nhu cầu- Đầu sử dụng PMH đồng thời	
TASK-0096	Cập nhật khuyến mãi đích danh trang chi tiết	Phúc	Done	Medium	30/09/2025		
TASK-0097	LƯU VỊ TRÍ XEM TRANG	Giang	Not Started	High	15/10/2025	https://docs.google.com/document/d/1ImyPqM1u-urM7v6IxvBCodDSdHyYCTVcXJ0qM1jK5q8/edit?tab=t.0		
TASK-0098	Sắp xếp thứ tự biến thể của sản phẩm	Thanh	Not Started	High	20/10/2025		
TASK-0099	Hiển thị keyselling point trang campaign	Thanh	Not Started	High	20/10/2025	https://docs.google.com/document/d/1Y5mr7dlb6URyiQCMqZQ3TEu6fP6QL5LGLsDMeQrefA4/edit?tab=t.0#heading=h.xybbw1se7yqn		
TASK-0100	Nội dung chương trình Săn Voucher	Thanh	Done	High	5/10/2025	https://docs.google.com/spreadsheets/d/1fvNIiFTW4NE17hy97JkSbHofmXycH1wnwnnR9C1ARto/edit?gid=0#gid=0	- Xong giai đoạn Teasing Và Launching, chờ review	
TASK-0101	Nội dung chương trình Tải App	Thanh	In Progress	High	5/10/2025		
TASK-0102	Nâng cấp LDP tải App	Giang	In Progress	High	20/10/2025		
TASK-0103	Thêm hướng dẫn sử dụng trang chi tiết	Thanh	In Progress	High		
TASK-0104	Tối ưu block Khuyến Mãi Bùng Nổ Trang Chủ	Giang	Not Started	Medium		
TASK-0105	Nâng cấp luồng sử dụng PMH trong giỏ hàng	Giang	Not Started	Medium	https://docs.google.com/document/d/1HWJVbJ5GVWORJwRTROaXVRHRSBXQxz8_3zOI0SKNgYg/edit?tab=t.0#bookmark=id.20fzaan95ao		
TASK-0106	Mã tích điểm QTV	Phúc	In Progress	High	09/10/2025		09/10/2025: Họp với QTV, Legal để clear về luồng cùng SOM	
TASK-0107	Kế hoạch truyền thông trang tải App	Thanh	Done	High	6/10/2025	https://docs.google.com/spreadsheets/d/1N-vMpG1RE8MNOBcrD0lr936t4r2rtttzxUaJpAhNu9I/edit?gid=0#gid=0		
TASK-0108	Update giap diện trang chi tiết	Thanh, Tú	In Progress	High	16/10/2025		
TASK-0109	Hội thảo tiền sản Friso - Tạo form CSKH	Luân	In Progress	Emergency	15/10/2025		
TASK-0110	Điều chỉnh chính sách App/Web AVAKids	Phúc	In Progress	High	15/10/2025		
TASK-0111	Điều chỉnh rule Popup	Giang	In Progress	Medium	15/10/2025		
TASK-0112	Bổ sung sắp xếp nổi bật trang cate	Tú	In Progress	Low	30/10/2025	https://docs.google.com/document/d/1F_P-LgipclNDxCskt2tBu3MMygwm-K_1E8AJaaZkJfg/edit?tab=t.16m1d5p3ptbd#heading=h.yzhkz9yqostb		
TASK-0113	Update trạng thái sản phẩm trên PIM	Thanh	In Progress	Medium	30/10/2025	https://docs.google.com/document/d/1pehjz4PV9jjaH3xm8I493zuA9OtuBlCqTX-rdV6R7_U/edit?tab=t.0		
TASK-0114	Tối ưu sửa sdt trong luồng sửa địa chỉ nhận hàng	Tú	Not Started	High	25/10/2025		`;
    
    const csvData = parseGoogleSheetsData(sampleData);
    
    console.log(`📊 Found ${csvData.length} tasks in Google Sheets data`);
    
    // Get project mappings
    const projectQuery = 'SELECT id, project_code FROM projects';
    const projectResult = await client.query(projectQuery);
    const projectMap = {};
    projectResult.rows.forEach(row => {
      projectMap[row.project_code] = row.id;
    });
    
    // Clear existing tasks
    console.log('🗑️ Clearing existing tasks...');
    await client.query('DELETE FROM tasks');
    console.log('✅ Existing tasks cleared');
    
    // Import tasks
    console.log('📥 Importing tasks...');
    let importedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const csvRow = csvData[i];
      
      // Skip empty rows or rows without task name
      if (!csvRow['Tên công việc'] || csvRow['Tên công việc'].trim() === '') {
        skippedCount++;
        continue;
      }
      
      // Skip rows that are just empty cells
      if (Object.values(csvRow).every(value => !value || value.trim() === '')) {
        skippedCount++;
        continue;
      }
      
      const taskData = mapTaskData(csvRow, i);
      const projectCode = determineProject(taskData.task_name);
      const projectId = projectMap[projectCode] || projectMap['GENERAL'];
      
      // Convert deadline format if exists
      if (taskData.deadline) {
        try {
          const [day, month, year] = taskData.deadline.split('/');
          if (day && month && year) {
            taskData.deadline = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            taskData.deadline = null;
          }
        } catch (error) {
          taskData.deadline = null;
        }
      }
      
      const insertTask = `
        INSERT INTO tasks (
          task_id, task_name, assignee, status, priority, deadline,
          description, notes, link_description, project_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      try {
        await client.query(insertTask, [
          taskData.task_id,
          taskData.task_name,
          taskData.assignee,
          taskData.status,
          taskData.priority,
          taskData.deadline,
          taskData.description,
          taskData.notes,
          taskData.link_description,
          projectId,
          taskData.created_at,
          taskData.updated_at
        ]);
        importedCount++;
      } catch (error) {
        console.error(`❌ Error importing task ${taskData.task_id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Imported: ${importedCount} tasks`);
    console.log(`⏭️ Skipped: ${skippedCount} tasks`);
    
    // Show project distribution
    console.log('\n📊 Project Distribution:');
    const distributionQuery = `
      SELECT p.project_name, COUNT(t.task_id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id, p.project_name
      ORDER BY task_count DESC
    `;
    
    const distributionResult = await client.query(distributionQuery);
    distributionResult.rows.forEach(row => {
      console.log(`   ${row.project_name}: ${row.task_count} tasks`);
    });
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
importFromGoogleSheets()
  .then(() => {
    console.log('\n✅ Google Sheets import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Google Sheets import failed:', error);
    process.exit(1);
  });

