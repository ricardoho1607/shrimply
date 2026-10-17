import { AppAlert as Alert } from '../../components/alerts/appAlert';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  generateDailyOperationsReportHTML,
  type DailyOperationsReportData,
} from '../../shared/dailyOperationsReport';
import type { DailyOperationsLanguage } from '../../shared/dailyOperationsI18n';

const PDF_BACKGROUND_ASSET = require('../../assets/pdf/shrimply-pdf-background.png');
const PDF_LOGO_ASSET = require('../../assets/pdf/shrimply-logo.png');

const loadBase64Asset = async (assetModule: number): Promise<string> => {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  const assetUri = asset.localUri || asset.uri;
  if (!assetUri) throw new Error('Unable to resolve PDF asset URI');
  return FileSystem.readAsStringAsync(assetUri, { encoding: FileSystem.EncodingType.Base64 });
};

export const exportDailyOperationsReportPDF = async (
  data: DailyOperationsReportData,
  language: DailyOperationsLanguage = 'en',
): Promise<void> => {
  try {
    const [backgroundBase64, logoBase64] = await Promise.all([
      loadBase64Asset(PDF_BACKGROUND_ASSET),
      loadBase64Asset(PDF_LOGO_ASSET),
    ]);
    const html = generateDailyOperationsReportHTML(
      data,
      { backgroundBase64, logoBase64 },
      language,
      Platform.OS === 'ios',
    );
    const { uri } = await Print.printToFileAsync({
      html,
      textZoom: 100,
      width: 792,
      height: 612,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      base64: false,
    });
    const filename = `Shrimply-Daily-Operations-${data.reportDate}.pdf`;
    if (Platform.OS === 'web') return;
    if (!FileSystem.documentDirectory) throw new Error('Unable to resolve PDF output directory');
    const outputUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: outputUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(outputUri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
    } else {
      Alert.alert('PDF created', outputUri);
    }
  } catch (error) {
    console.error('Failed to export daily operations report:', error);
    throw error;
  }
};
