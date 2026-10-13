import {
  ScrollView,
  Text,
  TouchableOpacity, View
} from 'react-native';
import { InputField } from './InputField';
import { styles } from './pondManagementStyles';
import type { PondManagementViewModel } from './usePondManagement';
type Props = Pick<PondManagementViewModel,
  't'
  | 'isEnterpriseFarm'
  | 'availableEnterpriseBlocks'
  | 'formData'
  | 'updateForm'>;
export function PhysicalPondForm({ t, isEnterpriseFarm, availableEnterpriseBlocks, formData, updateForm }: Props) {
  return (<><>
    <Text style={styles.inputHint}>
      {t.enterpriseCycle.addPhysicalPondHint}
    </Text>
    {isEnterpriseFarm && (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t.enterprise.selectBlock}</Text>
        {availableEnterpriseBlocks.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pondSelector}>
            {availableEnterpriseBlocks.map((block) => (
              <TouchableOpacity
                key={block.id}
                style={[styles.pondOption, formData.blockId === block.id && styles.pondOptionSelected]}
                onPress={() => updateForm('blockId', block.id)}
              >
                <Text style={[styles.pondOptionText, formData.blockId === block.id && styles.pondOptionTextSelected]}>
                  {block.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.inputHint}>{t.enterprise.noAssignedBlocks}</Text>
        )}
      </View>
    )}
    <InputField
      label={t.forms.pondName}
      value={formData.pondName}
      onChangeText={(value) => updateForm('pondName', value)}
      placeholder={t.home.pondNamePlaceholder}
    />
    <InputField
      label={t.forms.pondSize}
      value={formData.pondArea}
      onChangeText={(value) => updateForm('pondArea', value)}
      placeholder={t.home.pondAreaHint}
      keyboardType="numeric"
    />
  </></>);
}
