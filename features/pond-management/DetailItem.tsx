import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Platform,
  Text,
  View
} from 'react-native';
import ShrimpIcon from "../../app/components/icons/ShrimpIcon";
import { styles } from './pondManagementStyles';

export const DetailItem = ({
  iconName,
  label,
  value,
  isShrimp = false
}: {
  iconName?: string;
  label?: string;
  value?: string;
  isShrimp?: boolean
}) => {
  if (!iconName && !label && !value && !isShrimp) {
    return <View style={styles.detailItem} />;
  }

  return (
    <View style={styles.detailItem}>
      {isShrimp ? (
        <ShrimpIcon size={14} color="#dce8f2" />
      ) : iconName ? (
        <Ionicons name={iconName as any} size={14} color="#dce8f2" />
      ) : (
        <View style={{ width: 14 }} />
      )}
      <Text
        style={styles.detailLabel}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label || ''}
      </Text>
      <Text
        style={styles.detailValue}
        numberOfLines={1}
        adjustsFontSizeToFit={Platform.OS === 'android'}
        minimumFontScale={0.85}
      >
        {value || ''}
      </Text>
    </View>
  );
};
