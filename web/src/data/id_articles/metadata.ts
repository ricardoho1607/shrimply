import type { ResourceAuthor, ResourceReviewer } from "../resourceLibrary";

export const defaultResourceAuthorID: ResourceAuthor = {
  name: "Tim Operasional Teknis Shrimply",
  role: "Spesialis Operasi & Data Akuakultur",
  bio: "Praktisi tambak udang vannamei dan insinyur akuakultur yang berdedikasi pada pencatatan data kolam yang presisi, manajemen kualitas air berbasis bukti, dan optimalisasi biomassa panen.",
};

export const defaultTechnicalReviewerID: ResourceReviewer = {
  name: "Dr. B. Raharjo, Ph.D.",
  role: "Spesialis Sistem Akuakultur & Kualitas Air",
  credentials: "Doktor Teknik Akuakultur, 18+ tahun pengalaman konsultasi tambak udang tropis dan audit biosekuriti",
};

export const defaultNutritionReviewerID: ResourceReviewer = {
  name: "M. S. Arifin, M.Sc.",
  role: "Spesialis Nutrisi Udang & Manajemen Pakan",
  credentials: "Magister Nutrisi Hewan Akuatik, 14+ tahun formulasi pakan vannamei komersial dan optimasi feeding rate",
};

export const defaultOperationsReviewerID: ResourceReviewer = {
  name: "H. Kurniawan, S.Pi., M.M.",
  role: "Spesialis Operasi Akuakultur & Ekonomi Tambak",
  credentials: "Magister Manajemen Agribisnis, 15+ tahun perencanaan produksi tambak udang komersial, pemodelan biaya siklus, dan operasi panen",
};
