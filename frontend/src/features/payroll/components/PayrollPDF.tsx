import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyInfo: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 10,
    color: '#666666',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333333',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    backgroundColor: '#f5f5f5',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 10,
  },
  label: {
    color: '#666666',
  },
  value: {
    fontWeight: 'bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    marginVertical: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
  },
  logo: {
    width: 100,
    height: 50,
    objectFit: 'contain',
  },
});

interface PayrollPDFProps {
  payroll: {
    date: { seconds: number };
    regularHours: number;
    overtimeHours: number;
    baseSalary: number;
    overtimePay: number;
    totalSalary: number;
    calculationMode: string;
    payrollId: string;
  };
  employeeData: {
    name: string;
    email: string;
    department: string;
    currentDepartment: string;
  };
}

const PayrollPDF: React.FC<PayrollPDFProps> = ({ payroll, employeeData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <View>
          <Image
            style={styles.logo}
            src="/company-logo.svg"
          />
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>Mini ERP System</Text>
          <Text style={styles.companyAddress}>
            123 Business Street{'\n'}
            Silicon Valley, CA 94025{'\n'}
            United States
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>
        Payroll Statement - {format(new Date(payroll.date.seconds * 1000), 'MMMM yyyy')}
      </Text>

      {/* Employee Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{employeeData.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Department:</Text>
          <Text style={styles.value}>{employeeData.currentDepartment}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{employeeData.email}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Work Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Work Hours</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Regular Hours:</Text>
          <Text style={styles.value}>{payroll.regularHours} hrs</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overtime Hours:</Text>
          <Text style={styles.value}>{payroll.overtimeHours} hrs</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Hours:</Text>
          <Text style={styles.value}>
            {(payroll.regularHours + payroll.overtimeHours).toFixed(2)} hrs
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Earnings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Base Salary:</Text>
          <Text style={styles.value}>${payroll.baseSalary.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overtime Pay:</Text>
          <Text style={styles.value}>${payroll.overtimePay.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Earnings:</Text>
          <Text style={styles.value}>${payroll.totalSalary.toFixed(2)}</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        This is a computer-generated document. No signature is required.{'\n'}
        Payroll ID: {payroll.payrollId} • Generated on: {format(new Date(), 'dd MMM yyyy HH:mm')}
      </Text>
    </Page>
  </Document>
);

export default PayrollPDF;
