import PurchaseOrder from "../component/PurchaseOrderSummary";
const PurchaseRequestCard = ({project_code, vendor_id, onSelectionChange}) => {
  
  return (
    <>
     <PurchaseOrder project_code={project_code} vendor_id={vendor_id} onSelectionChange={onSelectionChange}/>
    </>
  );
};

export default PurchaseRequestCard;
