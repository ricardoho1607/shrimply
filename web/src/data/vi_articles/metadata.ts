import type { ResourceAuthor, ResourceReviewer } from "../resourceLibrary";

export const defaultResourceAuthorVI: ResourceAuthor = {
  name: "Đội ngũ Kỹ thuật Shrimply",
  role: "Chuyên viên Dữ liệu & Vận hành Nuôi trồng Thủy sản",
  bio: "Kỹ sư dữ liệu và chuyên gia thực hành nuôi tôm thẻ chân trắng, tận tâm với việc ghi chép nhật ký ao nuôi chính xác, quản lý chất lượng nước dựa trên bằng chứng khoa học và tối ưu hóa sinh khối thu hoạch.",
};

export const defaultTechnicalReviewerVI: ResourceReviewer = {
  name: "TS. Nguyễn Văn Hùng, Ph.D.",
  role: "Chuyên gia Hệ thống Nuôi trồng Thủy sản & Chất lượng Nước",
  credentials: "Tiến sĩ Kỹ thuật Nuôi trồng Thủy sản, hơn 18 năm kinh nghiệm tư vấn kỹ thuật ao tôm thương phẩm nhiệt đới và giám sát an toàn sinh học.",
};

export const defaultNutritionReviewerVI: ResourceReviewer = {
  name: "ThS. Trần Minh Tuấn, M.Sc.",
  role: "Chuyên gia Dinh dưỡng Thủy sản & Quản lý Thức ăn Tôm",
  credentials: "Thạc sĩ Dinh dưỡng Động vật Thủy sản, hơn 14 năm kinh nghiệm nghiên cứu khẩu phần thức ăn tôm thẻ chân trắng và tối ưu hóa hệ số FCR.",
};

export const defaultOperationsReviewerVI: ResourceReviewer = {
  name: "ThS. Lê Hoàng Nam, M.Sc.",
  role: "Chuyên gia Vận hành Trang trại Tôm & Kinh tế Thủy sản",
  credentials: "Thạc sĩ Quản trị Kinh tế Nông nghiệp, hơn 15 năm kinh nghiệm lập kế hoạch vụ nuôi thương phẩm, hạch toán giá thành sản xuất (COGS) và quản lý thu hoạch.",
};
