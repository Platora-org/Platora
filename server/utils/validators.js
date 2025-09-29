export const validateKYCData = (data) => {
  const errors = {};
  
  // TIN validation (9-12 digits)
  if (!data.tin_number) {
    errors.tin_number = "TIN number is required";
  } else if (!/^[0-9]{9,12}$/.test(data.tin_number)) {
    errors.tin_number = "TIN must be 9-12 digits only";
  }
  
  // Bank account validation (6-20 digits)
  if (!data.bank_account_number) {
    errors.bank_account_number = "Bank account number is required";
  } else if (!/^[0-9]{6,20}$/.test(data.bank_account_number)) {
    errors.bank_account_number = "Bank account must be 6-20 digits";
  }
  
  // Bank name validation
  if (!data.bank_name) {
    errors.bank_name = "Bank name is required";
  } else if (!/^[A-Za-z\s&.-]{2,50}$/.test(data.bank_name)) {
    errors.bank_name = "Invalid bank name format";
  }
  
  // Branch validation
  if (!data.branch) {
    errors.branch = "Branch name is required";
  } else if (!/^[A-Za-z0-9\s&.,-]{2,50}$/.test(data.branch)) {
    errors.branch = "Invalid branch name format";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};