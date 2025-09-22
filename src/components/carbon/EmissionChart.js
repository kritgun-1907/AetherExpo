// src/components/carbon/EmissionChart.js
import React from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function EmissionChart({ data }) {
  const screenWidth = Dimensions.get('window').width;

  return (
    <View>
      <LineChart
        data={{
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            data: data || [8.2, 6.5, 7.1, 5.9, 8.8, 6.2, 7.5]
          }]
        }}
        width={screenWidth - 30}
        height={200}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        }}
        bezier
        style={{ borderRadius: 16, marginVertical: 8 }}
      />
    </View>
  );
}