export type EmploymentStatus = "Permanent" | "Probation";

export type SalaryEmployee = {
  baseSalary: number;
  leaveAllowance: number;
  status: EmploymentStatus;
};

export type SalaryInputs = {
  previousLeaveBalance: number;
  currentMonthLeaves: number;
  sandwichLeaves: number;
  adjustment: number;
};

export type SalaryResult = {
  perDayRate: number;
  allowedLeaves: number;
  monthlyLeaves: number;
  totalLeaves: number;
  chargeableLeaves: number;
  deduction: number;
  finalSalary: number;
};

const PAYROLL_MONTH_DAYS = 30;

const toNumber = (value: number) => (Number.isFinite(value) ? value : 0);

export const roundMoney = (value: number) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

export const calcSalary = (employee: SalaryEmployee, inputs: SalaryInputs): SalaryResult => {
  const baseSalary = Math.max(0, toNumber(employee.baseSalary));
  const carryForwardLeaves = Math.max(0, toNumber(inputs.previousLeaveBalance));
  const monthlyLeaves = Math.max(0, toNumber(inputs.currentMonthLeaves)) + Math.max(0, toNumber(inputs.sandwichLeaves));
  const allowedLeaves =
    employee.status === "Probation" ? 0 : carryForwardLeaves + Math.max(0, toNumber(employee.leaveAllowance));
  const totalLeaves = carryForwardLeaves + monthlyLeaves;
  const perDayRate = baseSalary / PAYROLL_MONTH_DAYS;
  const chargeableLeaves = Math.max(0, monthlyLeaves - allowedLeaves);
  const deduction = chargeableLeaves * perDayRate;
  const finalSalary = baseSalary - deduction + toNumber(inputs.adjustment);

  return {
    perDayRate: roundMoney(perDayRate),
    allowedLeaves: roundMoney(allowedLeaves),
    monthlyLeaves: roundMoney(monthlyLeaves),
    totalLeaves: roundMoney(totalLeaves),
    chargeableLeaves: roundMoney(chargeableLeaves),
    deduction: roundMoney(deduction),
    finalSalary: roundMoney(finalSalary)
  };
};
