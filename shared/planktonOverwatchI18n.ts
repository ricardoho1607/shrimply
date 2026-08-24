import type { PlanktonOverwatchSnapshot, PlanktonOverwatchState } from './planktonOverwatch';

export const PLANKTON_OVERWATCH_SIGNAL_IDS = [
  'dawn_do_below_4',
  'dawn_do_watch',
  'dawn_do_declining',
  'overnight_do_drop',
  'rapid_plankton_rise',
  'rapid_plankton_decline',
  'plankton_outside_pond_baseline',
  'community_shift_to_cyanobacteria',
  'secchi_falling',
  'cyanobacteria_increasing',
  'cyanobacteria_share_elevated',
  'ph_swing_high',
  'afternoon_ph_high',
  'tan_elevated',
  'nh4_elevated',
  'nitrite_elevated',
  'np_ratio_signal',
  'sludge_load_high',
  'organic_matter_high',
  'feeding_response_weak',
  'shrimp_behaviour_abnormal',
  'mortality_escalation',
  'surface_scum_observed',
] as const;

type PlanktonOverwatchSignalId = typeof PLANKTON_OVERWATCH_SIGNAL_IDS[number];
type MissingDataKey =
  | 'total plankton density'
  | 'plankton composition'
  | 'dawn dissolved oxygen'
  | 'morning and afternoon pH'
  | 'enough trend history';

export interface PlanktonOverwatchLocalizedCopy {
  overwatchMessages: Record<PlanktonOverwatchState, string>;
  overwatchActions: Record<PlanktonOverwatchState, string>;
  overwatchSignals: Record<PlanktonOverwatchSignalId, string>;
  overwatchMissingLabels: Record<MissingDataKey, string>;
  overwatchUnknownSignal: string;
  overwatchUnknownMissingData: string;
}

export const planktonOverwatchLocalizedCopy: Record<'en' | 'id' | 'th' | 'vi' | 'zh', PlanktonOverwatchLocalizedCopy> = {
  en: {
    overwatchMessages: {
      insufficient: 'There is not enough data to assess plankton stability safely.',
      stable: 'Plankton and water-quality conditions are currently stable.',
      watch: 'Plankton conditions are becoming unstable and need closer monitoring.',
      high: 'Plankton instability risk is high, with signs of bloom stress or greater nighttime oxygen demand.',
      critical: 'Possible bloom instability or oxygen depletion. Protect the shrimp\'s oxygen supply immediately.',
    },
    overwatchActions: {
      insufficient: 'Record dawn DO and paired morning and afternoon pH.',
      stable: 'Continue normal monitoring.',
      watch: 'Recheck dawn DO and paired morning and afternoon pH.',
      high: 'Increase or optimise aeration, especially overnight.',
      critical: 'Protect the oxygen supply immediately and monitor DO repeatedly.',
    },
    overwatchSignals: {
      dawn_do_below_4: 'Dawn dissolved oxygen is below the safe level.',
      dawn_do_watch: 'Dawn dissolved oxygen needs attention.',
      dawn_do_declining: 'Dawn oxygen is trending downward.',
      overnight_do_drop: 'The overnight oxygen decline is elevated.',
      rapid_plankton_rise: 'Plankton density rose rapidly.',
      rapid_plankton_decline: 'Plankton density fell rapidly.',
      plankton_outside_pond_baseline: 'Plankton is outside this pond\'s recent baseline.',
      community_shift_to_cyanobacteria: 'The plankton community is shifting toward cyanobacteria.',
      secchi_falling: 'Secchi depth is falling.',
      cyanobacteria_increasing: 'Cyanobacteria are increasing across repeated results.',
      cyanobacteria_share_elevated: 'The cyanobacteria share is elevated.',
      ph_swing_high: 'The daily pH swing is widening.',
      afternoon_ph_high: 'Afternoon pH is high.',
      tan_elevated: 'TAN is elevated.',
      nh4_elevated: 'Ammonium is elevated.',
      nitrite_elevated: 'Nitrite is elevated.',
      np_ratio_signal: 'The molar DIN:DIP ratio is outside the ecological reference range.',
      sludge_load_high: 'Sludge load is high.',
      organic_matter_high: 'Organic matter is elevated.',
      feeding_response_weak: 'Feeding response is weak.',
      shrimp_behaviour_abnormal: 'Abnormal shrimp behaviour was observed.',
      mortality_escalation: 'Mortality is escalating.',
      surface_scum_observed: 'Surface scum was observed.',
    },
    overwatchMissingLabels: {
      'total plankton density': 'total plankton density',
      'plankton composition': 'plankton composition',
      'dawn dissolved oxygen': 'dawn dissolved oxygen',
      'morning and afternoon pH': 'morning and afternoon pH',
      'enough trend history': 'enough trend history',
    },
    overwatchUnknownSignal: 'An additional risk signal was detected.',
    overwatchUnknownMissingData: 'other required monitoring data',
  },
  id: {
    overwatchMessages: {
      insufficient: 'Data belum cukup untuk menilai kestabilan plankton dengan aman.',
      stable: 'Kondisi plankton dan kualitas air saat ini stabil.',
      watch: 'Kondisi plankton mulai tidak stabil dan perlu dipantau lebih ketat.',
      high: 'Risiko ketidakstabilan plankton tinggi, dengan tanda tekanan pada ledakan plankton atau peningkatan kebutuhan oksigen pada malam hari.',
      critical: 'Kemungkinan ledakan plankton tidak stabil atau kekurangan oksigen. Segera lindungi pasokan oksigen udang.',
    },
    overwatchActions: {
      insufficient: 'Catat DO saat fajar serta pH pagi dan sore secara berpasangan.',
      stable: 'Lanjutkan pemantauan normal.',
      watch: 'Periksa kembali DO saat fajar serta pH pagi dan sore secara berpasangan.',
      high: 'Tingkatkan atau optimalkan aerasi, terutama pada malam hari.',
      critical: 'Segera lindungi pasokan oksigen dan pantau DO berulang kali.',
    },
    overwatchSignals: {
      dawn_do_below_4: 'Oksigen terlarut saat fajar berada di bawah batas aman.',
      dawn_do_watch: 'Oksigen terlarut saat fajar perlu diperhatikan.',
      dawn_do_declining: 'Oksigen saat fajar menunjukkan tren menurun.',
      overnight_do_drop: 'Penurunan oksigen semalaman tergolong tinggi.',
      rapid_plankton_rise: 'Kepadatan plankton meningkat dengan cepat.',
      rapid_plankton_decline: 'Kepadatan plankton menurun dengan cepat.',
      plankton_outside_pond_baseline: 'Kondisi plankton berada di luar kisaran dasar terbaru tambak ini.',
      community_shift_to_cyanobacteria: 'Komunitas plankton bergeser menuju sianobakteri.',
      secchi_falling: 'Kedalaman Secchi menurun.',
      cyanobacteria_increasing: 'Sianobakteri meningkat pada beberapa hasil berturut-turut.',
      cyanobacteria_share_elevated: 'Proporsi sianobakteri tergolong tinggi.',
      ph_swing_high: 'Perubahan pH harian semakin lebar.',
      afternoon_ph_high: 'pH sore hari tinggi.',
      tan_elevated: 'TAN tergolong tinggi.',
      nh4_elevated: 'Amonium tergolong tinggi.',
      nitrite_elevated: 'Nitrit tergolong tinggi.',
      np_ratio_signal: 'Rasio molar DIN:DIP berada di luar kisaran acuan ekologis.',
      sludge_load_high: 'Beban lumpur tinggi.',
      organic_matter_high: 'Bahan organik tergolong tinggi.',
      feeding_response_weak: 'Respons makan lemah.',
      shrimp_behaviour_abnormal: 'Perilaku udang yang tidak normal teramati.',
      mortality_escalation: 'Kematian udang meningkat.',
      surface_scum_observed: 'Lapisan buih di permukaan teramati.',
    },
    overwatchMissingLabels: {
      'total plankton density': 'kepadatan plankton total',
      'plankton composition': 'komposisi plankton',
      'dawn dissolved oxygen': 'oksigen terlarut saat fajar',
      'morning and afternoon pH': 'pH pagi dan sore',
      'enough trend history': 'riwayat tren yang cukup',
    },
    overwatchUnknownSignal: 'Sinyal risiko tambahan terdeteksi.',
    overwatchUnknownMissingData: 'data pemantauan lain yang diperlukan',
  },
  th: {
    overwatchMessages: {
      insufficient: 'ข้อมูลยังไม่เพียงพอสำหรับประเมินความเสถียรของแพลงก์ตอนอย่างปลอดภัย',
      stable: 'ขณะนี้สภาพแพลงก์ตอนและคุณภาพน้ำมีความเสถียร',
      watch: 'สภาพแพลงก์ตอนเริ่มไม่เสถียรและต้องติดตามอย่างใกล้ชิดขึ้น',
      high: 'ความเสี่ยงที่แพลงก์ตอนจะไม่เสถียรอยู่ในระดับสูง โดยมีสัญญาณความเครียดของบลูมหรือความต้องการออกซิเจนตอนกลางคืนเพิ่มขึ้น',
      critical: 'อาจเกิดความไม่เสถียรของบลูมหรือออกซิเจนลดลง โปรดปกป้องออกซิเจนสำหรับกุ้งทันที',
    },
    overwatchActions: {
      insufficient: 'บันทึก DO ตอนรุ่งเช้าและค่า pH ตอนเช้ากับตอนบ่ายเป็นคู่',
      stable: 'ติดตามตามปกติต่อไป',
      watch: 'ตรวจ DO ตอนรุ่งเช้าและค่า pH ตอนเช้ากับตอนบ่ายซ้ำ',
      high: 'เพิ่มหรือปรับการเติมอากาศให้เหมาะสม โดยเฉพาะตอนกลางคืน',
      critical: 'ปกป้องออกซิเจนทันทีและตรวจ DO ซ้ำอย่างต่อเนื่อง',
    },
    overwatchSignals: {
      dawn_do_below_4: 'ออกซิเจนละลายน้ำตอนรุ่งเช้าต่ำกว่าระดับปลอดภัย',
      dawn_do_watch: 'ออกซิเจนละลายน้ำตอนรุ่งเช้าต้องเฝ้าระวัง',
      dawn_do_declining: 'ออกซิเจนตอนรุ่งเช้ามีแนวโน้มลดลง',
      overnight_do_drop: 'ออกซิเจนลดลงมากในช่วงกลางคืน',
      rapid_plankton_rise: 'ความหนาแน่นของแพลงก์ตอนเพิ่มขึ้นอย่างรวดเร็ว',
      rapid_plankton_decline: 'ความหนาแน่นของแพลงก์ตอนลดลงอย่างรวดเร็ว',
      plankton_outside_pond_baseline: 'แพลงก์ตอนอยู่นอกช่วงพื้นฐานล่าสุดของบ่อนี้',
      community_shift_to_cyanobacteria: 'ชุมชนแพลงก์ตอนกำลังเปลี่ยนไปทางไซยาโนแบคทีเรีย',
      secchi_falling: 'ความลึกของแผ่นเซคคิลดลง',
      cyanobacteria_increasing: 'ไซยาโนแบคทีเรียเพิ่มขึ้นต่อเนื่องในหลายผลตรวจ',
      cyanobacteria_share_elevated: 'สัดส่วนไซยาโนแบคทีเรียอยู่ในระดับสูง',
      ph_swing_high: 'ช่วงการเปลี่ยนแปลง pH รายวันกว้างขึ้น',
      afternoon_ph_high: 'ค่า pH ตอนบ่ายสูง',
      tan_elevated: 'ค่า TAN สูง',
      nh4_elevated: 'ค่าแอมโมเนียมสูง',
      nitrite_elevated: 'ค่าไนไตรต์สูง',
      np_ratio_signal: 'อัตราส่วนโมล DIN:DIP อยู่นอกช่วงอ้างอิงทางนิเวศวิทยา',
      sludge_load_high: 'ปริมาณตะกอนสูง',
      organic_matter_high: 'ปริมาณสารอินทรีย์สูง',
      feeding_response_weak: 'การตอบสนองต่ออาหารต่ำ',
      shrimp_behaviour_abnormal: 'พบพฤติกรรมกุ้งผิดปกติ',
      mortality_escalation: 'การตายของกุ้งเพิ่มขึ้น',
      surface_scum_observed: 'พบคราบลอยบนผิวน้ำ',
    },
    overwatchMissingLabels: {
      'total plankton density': 'ความหนาแน่นแพลงก์ตอนทั้งหมด',
      'plankton composition': 'องค์ประกอบแพลงก์ตอน',
      'dawn dissolved oxygen': 'ออกซิเจนละลายน้ำตอนรุ่งเช้า',
      'morning and afternoon pH': 'ค่า pH ตอนเช้าและตอนบ่าย',
      'enough trend history': 'ประวัติแนวโน้มที่เพียงพอ',
    },
    overwatchUnknownSignal: 'ตรวจพบสัญญาณความเสี่ยงเพิ่มเติม',
    overwatchUnknownMissingData: 'ข้อมูลติดตามอื่นที่จำเป็น',
  },
  vi: {
    overwatchMessages: {
      insufficient: 'Chưa đủ dữ liệu để đánh giá an toàn độ ổn định của phiêu sinh vật.',
      stable: 'Điều kiện phiêu sinh vật và chất lượng nước hiện đang ổn định.',
      watch: 'Điều kiện phiêu sinh vật đang trở nên không ổn định và cần được theo dõi chặt chẽ hơn.',
      high: 'Nguy cơ phiêu sinh vật mất ổn định ở mức cao, với dấu hiệu tảo nở hoa bị stress hoặc nhu cầu ôxy ban đêm tăng.',
      critical: 'Có thể xảy ra mất ổn định tảo nở hoa hoặc suy giảm ôxy. Hãy bảo vệ nguồn ôxy cho tôm ngay lập tức.',
    },
    overwatchActions: {
      insufficient: 'Ghi nhận DO lúc rạng sáng cùng pH buổi sáng và buổi chiều theo cặp.',
      stable: 'Tiếp tục theo dõi bình thường.',
      watch: 'Kiểm tra lại DO lúc rạng sáng cùng pH buổi sáng và buổi chiều.',
      high: 'Tăng hoặc tối ưu hóa sục khí, đặc biệt vào ban đêm.',
      critical: 'Bảo vệ nguồn ôxy ngay lập tức và theo dõi DO nhiều lần.',
    },
    overwatchSignals: {
      dawn_do_below_4: 'Ôxy hòa tan lúc rạng sáng thấp hơn mức an toàn.',
      dawn_do_watch: 'Ôxy hòa tan lúc rạng sáng cần được chú ý.',
      dawn_do_declining: 'Ôxy lúc rạng sáng đang có xu hướng giảm.',
      overnight_do_drop: 'Mức giảm ôxy qua đêm đang cao.',
      rapid_plankton_rise: 'Mật độ phiêu sinh vật tăng nhanh.',
      rapid_plankton_decline: 'Mật độ phiêu sinh vật giảm nhanh.',
      plankton_outside_pond_baseline: 'Phiêu sinh vật nằm ngoài mức nền gần đây của ao này.',
      community_shift_to_cyanobacteria: 'Quần xã phiêu sinh vật đang chuyển dịch sang vi khuẩn lam.',
      secchi_falling: 'Độ sâu Secchi đang giảm.',
      cyanobacteria_increasing: 'Vi khuẩn lam tăng qua nhiều kết quả liên tiếp.',
      cyanobacteria_share_elevated: 'Tỷ lệ vi khuẩn lam đang cao.',
      ph_swing_high: 'Biên độ pH hằng ngày đang rộng hơn.',
      afternoon_ph_high: 'pH buổi chiều cao.',
      tan_elevated: 'TAN đang cao.',
      nh4_elevated: 'Amoni đang cao.',
      nitrite_elevated: 'Nitrit đang cao.',
      np_ratio_signal: 'Tỷ lệ mol DIN:DIP nằm ngoài khoảng tham chiếu sinh thái.',
      sludge_load_high: 'Tải lượng bùn cao.',
      organic_matter_high: 'Chất hữu cơ đang cao.',
      feeding_response_weak: 'Phản ứng bắt mồi yếu.',
      shrimp_behaviour_abnormal: 'Đã quan sát thấy hành vi bất thường của tôm.',
      mortality_escalation: 'Tỷ lệ tôm chết đang tăng.',
      surface_scum_observed: 'Đã quan sát thấy váng trên mặt nước.',
    },
    overwatchMissingLabels: {
      'total plankton density': 'tổng mật độ phiêu sinh vật',
      'plankton composition': 'thành phần phiêu sinh vật',
      'dawn dissolved oxygen': 'ôxy hòa tan lúc rạng sáng',
      'morning and afternoon pH': 'pH buổi sáng và buổi chiều',
      'enough trend history': 'đủ lịch sử xu hướng',
    },
    overwatchUnknownSignal: 'Đã phát hiện thêm một tín hiệu rủi ro.',
    overwatchUnknownMissingData: 'dữ liệu theo dõi bắt buộc khác',
  },
  zh: {
    overwatchMessages: {
      insufficient: '数据不足，无法安全评估浮游生物的稳定性。',
      stable: '目前浮游生物和水质状况稳定。',
      watch: '浮游生物状况正趋于不稳定，需要加强监测。',
      high: '浮游生物失稳风险较高，已出现藻华受压或夜间耗氧增加的迹象。',
      critical: '可能发生藻华失稳或缺氧。请立即保障虾的氧气供应。',
    },
    overwatchActions: {
      insufficient: '记录黎明溶氧，并配对记录早晨和下午的 pH。',
      stable: '继续正常监测。',
      watch: '复查黎明溶氧以及早晨和下午的 pH。',
      high: '增加或优化增氧，尤其是在夜间。',
      critical: '立即保障氧气供应并反复监测溶氧。',
    },
    overwatchSignals: {
      dawn_do_below_4: '黎明溶氧低于安全水平。',
      dawn_do_watch: '黎明溶氧需要关注。',
      dawn_do_declining: '黎明溶氧呈下降趋势。',
      overnight_do_drop: '夜间溶氧降幅偏大。',
      rapid_plankton_rise: '浮游生物密度快速上升。',
      rapid_plankton_decline: '浮游生物密度快速下降。',
      plankton_outside_pond_baseline: '浮游生物状况超出该池塘近期基线范围。',
      community_shift_to_cyanobacteria: '浮游生物群落正在向蓝细菌转变。',
      secchi_falling: '塞氏盘透明度正在下降。',
      cyanobacteria_increasing: '蓝细菌在多次连续检测中持续增加。',
      cyanobacteria_share_elevated: '蓝细菌占比较高。',
      ph_swing_high: '每日 pH 波动正在扩大。',
      afternoon_ph_high: '下午 pH 偏高。',
      tan_elevated: '总氨氮偏高。',
      nh4_elevated: '铵浓度偏高。',
      nitrite_elevated: '亚硝酸盐偏高。',
      np_ratio_signal: 'DIN:DIP 摩尔比超出生态参考范围。',
      sludge_load_high: '底泥负荷较高。',
      organic_matter_high: '有机物含量偏高。',
      feeding_response_weak: '摄食反应较弱。',
      shrimp_behaviour_abnormal: '观察到虾行为异常。',
      mortality_escalation: '虾死亡数量正在增加。',
      surface_scum_observed: '观察到水面浮沫。',
    },
    overwatchMissingLabels: {
      'total plankton density': '浮游生物总密度',
      'plankton composition': '浮游生物组成',
      'dawn dissolved oxygen': '黎明溶氧',
      'morning and afternoon pH': '早晨和下午的 pH',
      'enough trend history': '足够的趋势历史数据',
    },
    overwatchUnknownSignal: '检测到其他风险信号。',
    overwatchUnknownMissingData: '其他必需的监测数据',
  },
};

const getMeasurements = (evidence: string) => (
  evidence.match(/[-+]?\d+(?:[.,]\d+)?(?:\s*(?:mg\/L|cells\/mL|cm|%|:1))?/g) || []
);

const localizeEvidence = (
  signalId: string,
  evidence: string,
  copy: PlanktonOverwatchLocalizedCopy,
) => {
  const summary = copy.overwatchSignals[signalId as PlanktonOverwatchSignalId] || copy.overwatchUnknownSignal;
  const measurements = getMeasurements(evidence);
  return measurements.length ? `${summary} (${measurements.join(', ')})` : summary;
};

export const localizePlanktonOverwatchSnapshot = (
  snapshot: PlanktonOverwatchSnapshot,
  copy: PlanktonOverwatchLocalizedCopy,
) => ({
  message: copy.overwatchMessages[snapshot.state] || copy.overwatchMessages.insufficient,
  evidence: (snapshot.signals || []).map((signal) => ({
    id: signal.id,
    text: localizeEvidence(signal.id, signal.evidence, copy),
  })),
  missing: (snapshot.dataQuality?.missing || []).map((item) => (
    copy.overwatchMissingLabels[item as MissingDataKey] || copy.overwatchUnknownMissingData
  )),
  nextAction: snapshot.recommendations?.length
    ? copy.overwatchActions[snapshot.state] || copy.overwatchActions.insufficient
    : undefined,
});
