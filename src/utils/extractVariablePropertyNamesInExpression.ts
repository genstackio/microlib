// (new.paymentAmount / joined.ticketPriceAmount) => ['ticketPriceAmount']
// (new.paymentAmount / (joined.ticketPriceAmount * joined.plannedTickets) => ['ticketPriceAmount', 'plannedTickets']

import deduplicateAndSort from "./deduplicateAndSort";

export function extractVariablePropertyNamesInExpression(s: string, varName: string) {
    return deduplicateAndSort(
        [...s.matchAll(new RegExp(`${varName}\.([a-zA-Z_0-9]+)`, 'g'))].map(x => x[1])
    );
}

export default extractVariablePropertyNamesInExpression;
