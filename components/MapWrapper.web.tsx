import React from 'react';
import { View, Text } from 'react-native';

const MapView = React.forwardRef(({ children, style }: any, ref) => (
  <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e1e4e8' }]}>
    <Text>Map not supported on web</Text>
    {children}
  </View>
));
MapView.displayName = 'MapView';

export const Marker = ({ children }: any) => <View>{children}</View>;
export const Circle = () => <View />;
export const PROVIDER_GOOGLE = null;
export default MapView;
