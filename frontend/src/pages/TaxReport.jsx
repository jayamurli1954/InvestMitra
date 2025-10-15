import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { FileText, TrendingUp, TrendingDown, DollarSign, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart as TremorBarChart, DonutChart } from '@tremor/react';

const TaxReport = () => {
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxReport();
  }, []);

  const fetchTaxReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tax-report`);
      setTaxData(response.data);
    } catch (error) {
      console.error('Error fetching tax report:', error);
      toast.error('Failed to load tax report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!taxData) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Tax Data Available</h3>
        <p className="text-slate-400">Record transactions to generate tax reports</p>
      </div>
    );
  }

  const { capital_gains, summary, unrealized } = taxData;

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Tax Report</h1>
          <p className="text-slate-400">Capital gains and tax liability summary</p>
        </div>
        <Button
          onClick={fetchTaxReport}
          variant="outline"
          className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Report
        </Button>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Short-Term Gains</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className={`text-2xl font-bold ${summary.short_term_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{summary.short_term_gain.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Holding &lt; 1 year</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Long-Term Gains</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className={`text-2xl font-bold ${summary.long_term_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{summary.long_term_gain.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Holding ≥ 1 year</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Realized Gain</span>
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <p className={`text-2xl font-bold ${summary.total_realized_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{summary.total_realized_gain.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">STCG + LTCG</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Tax Liability</span>
            <FileText className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">
            ₹{summary.total_tax_liability.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">STCG (15%) + LTCG (10%)</p>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Details */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Tax Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="text-white font-medium">Short-Term Capital Gains Tax</p>
                <p className="text-xs text-slate-400 mt-1">15% on STCG</p>
              </div>
              <p className="text-lg font-bold text-blue-400">₹{summary.stcg_tax.toFixed(2)}</p>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="text-white font-medium">Long-Term Capital Gains Tax</p>
                <p className="text-xs text-slate-400 mt-1">10% above ₹1L exemption</p>
              </div>
              <p className="text-lg font-bold text-purple-400">₹{summary.ltcg_tax.toFixed(2)}</p>
            </div>

            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div>
                <p className="text-white font-medium">LTCG Exemption Used</p>
                <p className="text-xs text-emerald-400 mt-1">₹1 Lakh exemption</p>
              </div>
              <p className="text-lg font-bold text-emerald-400">₹{summary.ltcg_exemption_used.toFixed(2)}</p>
            </div>

            <div className="flex items-start space-x-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mt-4">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Indian Tax Rules:</p>
                <ul className="text-xs space-y-1 text-blue-400">
                  <li>• STCG (holding &lt; 1 year): 15% tax</li>
                  <li>• LTCG (holding ≥ 1 year): 10% tax on gains above ₹1 lakh</li>
                  <li>• FIFO method used for cost basis calculation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Gains Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Gains Distribution</h2>
          {summary.total_realized_gain !== 0 ? (
            <div style={{ color: '#e2e8f0' }}>
              <DonutChart
                data={[
                  { name: 'Short-Term', value: Math.abs(summary.short_term_gain) },
                  { name: 'Long-Term', value: Math.abs(summary.long_term_gain) }
                ]}
                category="value"
                index="name"
                valueFormatter={(value) => `₹${value.toFixed(2)}`}
                colors={["sky", "violet"]}
                className="h-64"
                showAnimation={true}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No realized gains yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Realized Gains Details */}
      {(capital_gains.short_term.length > 0 || capital_gains.long_term.length > 0) && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Realized Transactions</h2>
          
          {capital_gains.short_term.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Short-Term Transactions</h3>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Quantity</th>
                      <th>Buy Price</th>
                      <th>Sell Price</th>
                      <th>Buy Date</th>
                      <th>Sell Date</th>
                      <th>Days Held</th>
                      <th>Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capital_gains.short_term.map((txn, idx) => (
                      <tr key={idx}>
                        <td className="text-white font-medium">{txn.symbol}</td>
                        <td className="text-white">{txn.quantity}</td>
                        <td className="text-white">₹{txn.buy_price.toFixed(2)}</td>
                        <td className="text-white">₹{txn.sell_price.toFixed(2)}</td>
                        <td className="text-slate-300">{new Date(txn.buy_date).toLocaleDateString()}</td>
                        <td className="text-slate-300">{new Date(txn.sell_date).toLocaleDateString()}</td>
                        <td className="text-slate-300">{txn.holding_days}</td>
                        <td className={txn.gain_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ₹{txn.gain_loss.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {capital_gains.long_term.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Long-Term Transactions</h3>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Quantity</th>
                      <th>Buy Price</th>
                      <th>Sell Price</th>
                      <th>Buy Date</th>
                      <th>Sell Date</th>
                      <th>Days Held</th>
                      <th>Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capital_gains.long_term.map((txn, idx) => (
                      <tr key={idx}>
                        <td className="text-white font-medium">{txn.symbol}</td>
                        <td className="text-white">{txn.quantity}</td>
                        <td className="text-white">₹{txn.buy_price.toFixed(2)}</td>
                        <td className="text-white">₹{txn.sell_price.toFixed(2)}</td>
                        <td className="text-slate-300">{new Date(txn.buy_date).toLocaleDateString()}</td>
                        <td className="text-slate-300">{new Date(txn.sell_date).toLocaleDateString()}</td>
                        <td className="text-slate-300">{txn.holding_days}</td>
                        <td className={txn.gain_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ₹{txn.gain_loss.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unrealized Gains */}
      {unrealized.holdings.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Unrealized Gains</h2>
          <p className="text-slate-400 mb-6">Current portfolio holdings (not yet sold)</p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Cost</th>
                  <th>Current Price</th>
                  <th>Cost Basis</th>
                  <th>Current Value</th>
                  <th>Unrealized Gain</th>
                  <th>Gain %</th>
                </tr>
              </thead>
              <tbody>
                {unrealized.holdings.map((holding, idx) => (
                  <tr key={idx}>
                    <td className="text-white font-medium">{holding.symbol}</td>
                    <td className="text-white">{holding.quantity}</td>
                    <td className="text-white">₹{holding.avg_cost.toFixed(2)}</td>
                    <td className="text-white">₹{holding.current_price.toFixed(2)}</td>
                    <td className="text-white">₹{holding.cost_basis.toFixed(2)}</td>
                    <td className="text-white">₹{holding.current_value.toFixed(2)}</td>
                    <td className={holding.unrealized_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      ₹{holding.unrealized_gain.toFixed(2)}
                    </td>
                    <td className={holding.gain_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {holding.gain_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-700">
                  <td colSpan="6" className="text-white font-bold">Total Unrealized Gain</td>
                  <td className={`font-bold ${unrealized.total_unrealized_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{unrealized.total_unrealized_gain.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReport;
