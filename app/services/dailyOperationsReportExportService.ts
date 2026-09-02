import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import {
  generateDailyOperationsReportHTML,
  type DailyOperationsReportData,
} from '../../shared/dailyOperationsReport';

const PDF_BACKGROUND_ASSET = require('../../assets/pdf/shrimply-pdf-background.png');
const PDF_LOGO_ASSET = require('../../assets/pdf/shrimply-logo.png');

const loadBase64Asset = async (assetModule: number): Promise<string> => {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();
  const assetUri = asset.localUri || asset.uri;
  if (!assetUri) throw new Error('Unable to resolve PDF asset URI');
  return FileSystem.readAsStringAsync(assetUri, { encoding: FileSystem.EncodingType.Base64 });
};

export const exportDailyOperationsReportPDF = async (data: DailyOperationsReportData): Promise<void> => {
  try {
    const [backgroundBase64, logoBase64] = await Promise.all([
      loadBase64Asset(PDF_BACKGROUND_ASSET),
      loadBase64Asset(PDF_LOGO_ASSET),
    ]);
    const html = generateDailyOperationsReportHTML(data, { backgroundBase64, logoBase64 });
    const { uri } = await Print.printToFileAsync({ html, width: 792, height: 612 });
    const filename = `Shrimply-Daily-Operations-${data.reportDate}.pdf`;

    if (Platform.OS === 'web') return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
    } else {
      Alert.alert('PDF created', uri);
    }
  } catch (error) {
    console.error('Failed to export daily operations report:', error);
    throw error;
  }
};
