import { Injectable } from '@nestjs/common';

@Injectable()
export class PrinterService {
  async printTicket(data: any) {
    // Armar objeto de ticket para impresión en frontend
    // data debe incluir: order, bill, mesa, cliente, método de pago, etc.
    const {
      order,
      bill,
      table,
      customer,
      paymentMethod,
      cashier,
      notes,
      printedAt,
    } = data;

    // Si no hay cliente, marcar como "Consumidor Final"
    const customerInfo = customer
      ? {
          nombre: `${customer.firstName} ${customer.lastName}`,
          telefono: customer.phone,
          email: customer.email || '',
        }
      : {
          nombre: 'Consumidor Final',
          telefono: '',
          email: '',
        };

    // Estructura del ticket
    const ticket = {
      mesa: table ? table.number : null,
      fecha: printedAt || new Date().toISOString(),
      mesero: order?.waiterId || null,
      cajero: cashier || null,
      cliente: customerInfo,
      productos: order?.items?.map(item => ({
        nombre: item.productName,
        cantidad: item.quantity,
        precioUnitario: item.unitPrice,
        total: item.totalPrice,
        instrucciones: item.specialInstructions || '',
        modificadores: item.modifiers || [],
      })) || [],
      subtotal: bill?.subtotal || order?.subtotal || 0,
      impuestos: bill?.taxAmount || order?.taxAmount || 0,
      descuento: bill?.discountAmount || order?.discountAmount || 0,
      propina: bill?.tipAmount || order?.tipAmount || 0,
      total: bill?.totalAmount || order?.totalAmount || 0,
      metodoPago: paymentMethod || (bill?.paymentDetails?.[0]?.method ?? null),
      pagos: bill?.paymentDetails || [],
      notas: notes || order?.notes || bill?.notes || '',
      folio: bill?.billNumber || order?.orderNumber || null,
    };

    return { success: true, ticket };
  }
}