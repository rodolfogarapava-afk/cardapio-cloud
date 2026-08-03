import { buildOrderTicketBase64, buildOrderTicketRoutesBase64, buildOrderUpdateBase64, buildOrderUpdateRoutesBase64, buildReceiptBase64, type OrderChange, type ReceiptItem } from "@/lib/printReceipt";
import { supabase } from "@/lib/supabase";

export async function queueKitchenOrder(input:{
  tenantId:string;
  commandId:number;
  customer:string;
  waiter?:string;
  items:ReceiptItem[];
  total:number;
  kind?:string;
}) {
  if(!supabase) throw new Error("Supabase não configurado");
  const data=buildOrderTicketBase64({customer:input.customer,waiter:input.waiter,items:input.items,total:input.total});
  const routes=buildOrderTicketRoutesBase64({customer:input.customer,waiter:input.waiter,items:input.items,total:input.total});
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:input.tenantId,
    p_command_id:input.commandId,
    p_payload:{data,routes,items:input.items,customer:input.customer,waiter:input.waiter,total:input.total,createdAt:Date.now()},
    p_job_kind:input.kind||"new_order",
  });
  if(error)throw error;
}

export async function queuePrinterTest(tenantId:string) {
  if(!supabase) throw new Error("Supabase não configurado");
  const now=Date.now();
  const data=buildOrderTicketBase64({
    customer:"TESTE DA IMPRESSORA",
    items:[{name:"Conexão com Cardápio Cloud OK",qty:1,unitPrice:0,total:0}],
    total:0,
  });
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:tenantId,
    p_command_id:-now,
    p_payload:{data,customer:"TESTE",total:0,createdAt:now},
    p_job_kind:"printer_test",
  });
  if(error)throw error;
}

export async function queueCustomerReceipt(input:{
  tenantId:string;
  saleId:number;
  customer:string;
  items:ReceiptItem[];
  total:number;
  paymentMethod:string;
}) {
  if(!supabase) throw new Error("Supabase não configurado");
  const data=buildReceiptBase64({
    customer:input.customer,
    items:input.items,
    total:input.total,
    paymentMethod:input.paymentMethod,
  });
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:input.tenantId,
    p_command_id:input.saleId,
    p_payload:{data,customer:input.customer,total:input.total,paymentMethod:input.paymentMethod,createdAt:Date.now()},
    p_job_kind:"customer_receipt",
  });
  if(error)throw error;
}

export async function queueOrderUpdate(input:{
  tenantId:string;
  commandId:number;
  customer:string;
  waiter?:string;
  changes:OrderChange[];
  newTotal:number;
}) {
  if(!supabase) throw new Error("Supabase não configurado");
  const data=buildOrderUpdateBase64({
    customer:input.customer,
    waiter:input.waiter,
    changes:input.changes,
    newTotal:input.newTotal,
  });
  const routes=buildOrderUpdateRoutesBase64({
    customer:input.customer,
    waiter:input.waiter,
    changes:input.changes,
    newTotal:input.newTotal,
  });
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:input.tenantId,
    p_command_id:input.commandId,
    p_payload:{data,routes,customer:input.customer,waiter:input.waiter,newTotal:input.newTotal,changes:input.changes,createdAt:Date.now()},
    p_job_kind:`order_update_${Date.now()}`,
  });
  if(error)throw error;
}
