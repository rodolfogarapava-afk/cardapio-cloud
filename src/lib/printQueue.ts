import { buildOrderTicketBase64, buildOrderTicketRoutesBase64, buildOrderUpdateBase64, buildOrderUpdateRoutesBase64, buildReceiptBase64, normalizeOrderChanges, normalizeReceiptItems, roundReceiptMoney, type OrderChange, type ReceiptItem } from "@/lib/printReceipt";
import { supabase } from "@/lib/supabase";

type PrinterSettings = {
  mode:"single"|"split";
  singlePrinter:1|2;
  printerOneCategories:string[];
};

async function loadPrinterSettings(tenantId:string):Promise<PrinterSettings>{
  const fallback:PrinterSettings={mode:"single",singlePrinter:1,printerOneCategories:[]};
  if(!supabase)return fallback;
  const {data,error}=await supabase
    .from("tenant_printer_settings")
    .select("mode,single_printer,printer_one_categories")
    .eq("tenant_id",tenantId)
    .maybeSingle();
  if(error||!data){
    if(error)console.warn("Configuração de impressão indisponível; usando modo seguro de uma impressora.",error);
    return fallback;
  }
  return {
    mode:data.mode==="split"?"split":"single",
    singlePrinter:Number(data.single_printer)===2?2:1,
    printerOneCategories:Array.isArray(data.printer_one_categories)?data.printer_one_categories.map(String):[],
  };
}

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
  const settings=await loadPrinterSettings(input.tenantId);
  const items=normalizeReceiptItems(input.items);
  const total=roundReceiptMoney(input.total);
  const data=buildOrderTicketBase64({customer:input.customer,waiter:input.waiter,items,total});
  const routes=settings.mode==="split"?buildOrderTicketRoutesBase64({customer:input.customer,waiter:input.waiter,items,total},settings.printerOneCategories):undefined;
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:input.tenantId,
    p_command_id:input.commandId,
    p_payload:{data,...(routes?{routes}:{}),routingMode:settings.mode,singlePrinter:settings.singlePrinter,items,customer:input.customer,waiter:input.waiter,total,createdAt:Date.now()},
    p_job_kind:input.kind||"new_order",
  });
  if(error)throw error;
}

export async function queuePrinterTest(tenantId:string) {
  if(!supabase) throw new Error("Supabase não configurado");
  const settings=await loadPrinterSettings(tenantId);
  const now=Date.now();
  const data=buildOrderTicketBase64({
    customer:"TESTE DA IMPRESSORA",
    items:[{name:"Conexão com Cardápio Cloud OK",qty:1,unitPrice:0,total:0}],
    total:0,
  });
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:tenantId,
    p_command_id:-now,
    p_payload:{
      data,
      ...(settings.mode==="split"?{routes:{
        printer1:{data,itemCount:1},printer2:{data,itemCount:1},
        skewers:{data,itemCount:1},sides:{data,itemCount:1},
      }}:{}),
      routingMode:settings.mode,
      singlePrinter:settings.singlePrinter,
      customer:"TESTE",total:0,createdAt:now,
    },
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
  const settings=await loadPrinterSettings(input.tenantId);
  const items=normalizeReceiptItems(input.items);
  const total=roundReceiptMoney(input.total);
  const data=buildReceiptBase64({
    customer:input.customer,
    items,
    total,
    paymentMethod:input.paymentMethod,
  });
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:input.tenantId,
    p_command_id:input.saleId,
    p_payload:{data,routingMode:"single",singlePrinter:settings.singlePrinter,customer:input.customer,total,paymentMethod:input.paymentMethod,createdAt:Date.now()},
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
  const settings=await loadPrinterSettings(input.tenantId);
  const changes=normalizeOrderChanges(input.changes);
  const newTotal=roundReceiptMoney(input.newTotal);
  const data=buildOrderUpdateBase64({
    customer:input.customer,
    waiter:input.waiter,
    changes,
    newTotal,
  });
  const routes=settings.mode==="split"?buildOrderUpdateRoutesBase64({
    customer:input.customer,
    waiter:input.waiter,
    changes,
    newTotal,
  },settings.printerOneCategories):undefined;
  const {error}=await supabase.rpc("queue_print_job",{
    p_tenant_id:input.tenantId,
    p_command_id:input.commandId,
    p_payload:{data,...(routes?{routes}:{}),routingMode:settings.mode,singlePrinter:settings.singlePrinter,customer:input.customer,waiter:input.waiter,newTotal,changes,createdAt:Date.now()},
    p_job_kind:`order_update_${Date.now()}`,
  });
  if(error)throw error;
}
