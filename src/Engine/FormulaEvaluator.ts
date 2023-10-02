import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

evaluate(formula: FormulaType) {
  
  // Initialize error message and result
  this._initializeEvaluation();

  if (formula.length === 2 && formula[0] === '(' && formula[1] === ')') {
    this._errorMessage = ErrorMessages.missingParentheses;
    this._result = 0;
    return;
  }

  // Check for empty formula
  if (this._isEmptyFormula(formula)) return;

  // Replace cell references with their values in the formula
  const formulaInValue = this._replaceCellReferencesWithValues(formula);
  if (this._errorMessage !== "") return;

  // Convert infix expression to postfix
  const outputQueue = this._convertToPostfix(formulaInValue);
  if (this._errorMessage !== "") return;

  // If the formula is a single number, return that number
  if (this._isSingleNumber(outputQueue)) return;

  // Evaluate the postfix expression
  this._evaluatePostfix(outputQueue);
}


private _initializeEvaluation() {
  this._errorMessage = "";
  this._result = 0;
}

private _isEmptyFormula(formula: FormulaType): boolean {
  // Check if the formula contains only parentheses and spaces
  const isEmpty = formula.every(token => token === '(' || token === ')' || token === ' ');
  
  if (isEmpty) {
    this._errorMessage = ErrorMessages.emptyFormula;
    return true;
  }
  
  return false;
}


private _replaceCellReferencesWithValues(formula: FormulaType): string[] {
  const formulaInValue: string[] = [...formula];
  formula.forEach((token, i) => {
    if (this.isCellReference(token)) {
      const [value, error] = this.getCellValue(token);
      this._errorMessage = error;
      formulaInValue[i] = String(value);
    }
  });
  return formulaInValue;
}

private _convertToPostfix(formulaInValue: string[]): TokenType[] {
  const operatorStack: TokenType[] = [];
  const outputQueue: TokenType[] = [];
  const precedence: { [key: string]: number } = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2
  };

  for (const token of formulaInValue) {
    if (this.isNumber(token)) {
      outputQueue.push(token);
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.pop();
    } else {
      while (operatorStack.length && precedence[token] <= precedence[operatorStack[operatorStack.length - 1]]) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    }
  }

  while (operatorStack.length) {
    outputQueue.push(operatorStack.pop()!);
  }

  return outputQueue;
}

private _isSingleNumber(outputQueue: TokenType[]): boolean {
  if (outputQueue.length === 1 && this.isNumber(outputQueue[0])) {
    this._result = Number(outputQueue[0]);
    return true;
  }
  return false;
}

private _evaluatePostfix(outputQueue: TokenType[]) {
  const valueStack: number[] = [];
  for (const token of outputQueue) {
    if (this.isNumber(token)) {
      valueStack.push(Number(token));
    } else {
      if (valueStack.length < 2) {
        this._errorMessage = ErrorMessages.invalidFormula;
        break;
      }
      const b = valueStack.pop();
      const a = valueStack.pop();
      if (b === undefined || a === undefined) {
        this._errorMessage = ErrorMessages.invalidFormula;
        break;
      }
      switch (token) {
        case '+':
          valueStack.push(a + b);
          break;
        case '-':
          valueStack.push(a - b);
          break;
        case '*':
          valueStack.push(a * b);
          break;
        case '/':
          if (b === 0) {
            this._errorMessage = ErrorMessages.divideByZero;
            this._result = Infinity;
            return;
          } else {
            valueStack.push(a / b);
          }
          break;
        default:
          this._errorMessage = ErrorMessages.invalidOperator;
          return;
      }
    }
  }
  this._result = valueStack[0];
}

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;
