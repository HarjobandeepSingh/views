import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    fontSize: 10,
  },
  smallText: {
    fontSize: 8,
    color: '#666',
  },
});

interface KeywordPDFProps {
  keywords: Array<{
    keyword: string;
    totalViews: number;
    formattedViews: string;
    totalGifs: number;
    formattedGifs: string;
    difficulty: number;
    cpc: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export const KeywordPDF = ({ keywords }: KeywordPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Keyword Research Report</Text>
      <Text style={styles.subtitle}>Generated on {new Date().toLocaleDateString()}</Text>
      
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCell}>Keyword</Text>
          <Text style={styles.tableCell}>Views</Text>
          <Text style={styles.tableCell}>GIFs</Text>
          <Text style={styles.tableCell}>Difficulty</Text>
          <Text style={styles.tableCell}>CPM ($)</Text>
        </View>
        
        {keywords.map((kw, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableCell}>{kw.keyword}</Text>
            <Text style={styles.tableCell}>
              {kw.formattedViews}
              {'\n'}
              <Text style={styles.smallText}>({kw.totalViews.toLocaleString()})</Text>
            </Text>
            <Text style={styles.tableCell}>
              {kw.formattedGifs}
              {'\n'}
              <Text style={styles.smallText}>({kw.totalGifs.toLocaleString()})</Text>
            </Text>
            <Text style={styles.tableCell}>{kw.difficulty}</Text>
            <Text style={styles.tableCell}>{kw.cpc}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
); 