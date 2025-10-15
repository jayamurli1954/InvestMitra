#!/usr/bin/env python3
"""
Backend Testing for AI-Powered Insights Endpoints
Tests the Investment Framework App AI insights functionality
"""

import requests
import json
import time
import os
from datetime import datetime, timezone, timedelta
import subprocess
import sys

# Configuration
BACKEND_URL = "https://smartinvest-54.preview.emergentagent.com/api"
TEST_USER_EMAIL = "jayamurli1954@gmail.com"

class AIInsightsBackendTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def create_test_session(self):
        """Create test user and session in MongoDB"""
        print("\n🔧 Setting up test authentication...")
        
        try:
            # Create unique test session
            timestamp = int(time.time())
            user_id = f"test-user-{timestamp}"
            session_token = f"test_session_{timestamp}"
            
            # MongoDB command to create test user and session
            mongo_cmd = f"""
            use('test_database');
            var userId = '{user_id}';
            var sessionToken = '{session_token}';
            var email = '{TEST_USER_EMAIL}';
            
            // Delete existing user and create new one
            db.users.deleteOne({{email: email}});
            db.users.insertOne({{
                _id: userId,
                id: userId,
                email: email,
                name: 'Test User AI Insights',
                picture: 'https://via.placeholder.com/150',
                auth_provider: 'test',
                created_at: new Date().toISOString()
            }});
            
            // Create session
            db.user_sessions.insertOne({{
                user_id: userId,
                session_token: sessionToken,
                expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                created_at: new Date().toISOString()
            }});
            
            // Create test portfolio with realistic data
            db.portfolio.deleteMany({{user_id: userId}});
            db.portfolio.insertMany([
                {{
                    id: 'holding-1-{timestamp}',
                    user_id: userId,
                    symbol: 'RELIANCE.NS',
                    name: 'Reliance Industries Ltd',
                    quantity: 50,
                    purchase_price: 2400.00,
                    purchase_date: '2024-01-15',
                    current_price: 2500.00
                }},
                {{
                    id: 'holding-2-{timestamp}',
                    user_id: userId,
                    symbol: 'TCS.NS',
                    name: 'Tata Consultancy Services Ltd',
                    quantity: 30,
                    purchase_price: 3200.00,
                    purchase_date: '2024-02-10',
                    current_price: 3300.00
                }},
                {{
                    id: 'holding-3-{timestamp}',
                    user_id: userId,
                    symbol: 'HDFCBANK.NS',
                    name: 'HDFC Bank Ltd',
                    quantity: 40,
                    purchase_price: 1500.00,
                    purchase_date: '2024-03-05',
                    current_price: 1550.00
                }},
                {{
                    id: 'holding-4-{timestamp}',
                    user_id: userId,
                    symbol: 'INFY.NS',
                    name: 'Infosys Ltd',
                    quantity: 25,
                    purchase_price: 1400.00,
                    purchase_date: '2024-01-20',
                    current_price: 1450.00
                }},
                {{
                    id: 'holding-5-{timestamp}',
                    user_id: userId,
                    symbol: 'ITC.NS',
                    name: 'ITC Ltd',
                    quantity: 100,
                    purchase_price: 420.00,
                    purchase_date: '2024-02-15',
                    current_price: 440.00
                }}
            ]);
            
            print('Test setup completed successfully');
            print('Session token: ' + sessionToken);
            print('User ID: ' + userId);
            """
            
            # Execute MongoDB command
            result = subprocess.run(
                ["mongosh", "--eval", mongo_cmd],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_id
                self.log_result(
                    "Authentication Setup",
                    True,
                    f"Test user and session created successfully",
                    f"User ID: {user_id}, Session: {session_token[:20]}..."
                )
                return True
            else:
                self.log_result(
                    "Authentication Setup",
                    False,
                    "Failed to create test user and session",
                    f"MongoDB error: {result.stderr}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Authentication Setup",
                False,
                f"Exception during setup: {str(e)}"
            )
            return False
    
    def test_authentication(self):
        """Test authentication with created session"""
        print("\n🔐 Testing authentication...")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_result(
                    "Authentication Test",
                    True,
                    "Authentication successful",
                    f"User: {user_data.get('email', 'N/A')}"
                )
                return True
            else:
                self.log_result(
                    "Authentication Test",
                    False,
                    f"Authentication failed with status {response.status_code}",
                    response.text[:200]
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Authentication Test",
                False,
                f"Authentication request failed: {str(e)}"
            )
            return False
    
    def test_portfolio_data(self):
        """Test that portfolio data exists"""
        print("\n📊 Testing portfolio data...")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(f"{BACKEND_URL}/portfolio", headers=headers, timeout=10)
            
            if response.status_code == 200:
                portfolio = response.json()
                if len(portfolio) > 0:
                    self.log_result(
                        "Portfolio Data Test",
                        True,
                        f"Portfolio contains {len(portfolio)} holdings",
                        f"Holdings: {[h.get('symbol', 'N/A') for h in portfolio[:3]]}"
                    )
                    return True
                else:
                    self.log_result(
                        "Portfolio Data Test",
                        False,
                        "Portfolio is empty - AI insights need portfolio data"
                    )
                    return False
            else:
                self.log_result(
                    "Portfolio Data Test",
                    False,
                    f"Failed to fetch portfolio: {response.status_code}",
                    response.text[:200]
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Portfolio Data Test",
                False,
                f"Portfolio request failed: {str(e)}"
            )
            return False
    
    def test_portfolio_optimization_endpoint(self):
        """Test AI Portfolio Optimization endpoint - Focus on markdown JSON parsing fix"""
        print("\n🤖 Testing AI Portfolio Optimization endpoint...")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/ai/portfolio-optimization",
                headers=headers,
                timeout=30  # AI calls can take longer
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Validate response structure
                    if "optimization_suggestions" in data:
                        suggestions = data["optimization_suggestions"]
                        
                        # Check for required fields
                        required_fields = ["rebalancing", "diversification", "risk_management", "tactical_moves"]
                        missing_fields = [field for field in required_fields if field not in suggestions]
                        
                        if not missing_fields:
                            # CRITICAL CHECK: Verify no markdown formatting in response
                            raw_response = response.text
                            has_markdown = "```json" in raw_response or "```" in raw_response
                            
                            if has_markdown:
                                self.log_result(
                                    "AI Portfolio Optimization - Markdown Check",
                                    False,
                                    "❌ CRITICAL: Response contains markdown formatting",
                                    f"Found markdown code blocks in response: {raw_response[:200]}..."
                                )
                                return False
                            
                            # Check that recommendations are properly structured (not truncated text)
                            rebalancing_items = suggestions.get("rebalancing", [])
                            if isinstance(rebalancing_items, list) and len(rebalancing_items) > 0:
                                first_item = str(rebalancing_items[0])
                                if len(first_item) > 10 and not first_item.startswith("Unable to"):
                                    self.log_result(
                                        "AI Portfolio Optimization",
                                        True,
                                        "✅ Portfolio optimization working - Clean JSON response without markdown",
                                        f"Response contains all required fields: {required_fields}"
                                    )
                                    
                                    # Log sample recommendations
                                    print(f"   ✅ Sample rebalancing advice: {first_item[:100]}...")
                                    print(f"   ✅ No markdown formatting detected in response")
                                    
                                    return True
                                else:
                                    self.log_result(
                                        "AI Portfolio Optimization",
                                        False,
                                        "Response contains fallback/truncated content",
                                        f"First rebalancing item: {first_item}"
                                    )
                                    return False
                            else:
                                self.log_result(
                                    "AI Portfolio Optimization",
                                    False,
                                    "Rebalancing recommendations are empty or invalid format"
                                )
                                return False
                        else:
                            self.log_result(
                                "AI Portfolio Optimization",
                                False,
                                f"Response missing required fields: {missing_fields}",
                                f"Available fields: {list(suggestions.keys())}"
                            )
                            return False
                    else:
                        self.log_result(
                            "AI Portfolio Optimization",
                            False,
                            "Response missing 'optimization_suggestions' field",
                            f"Response keys: {list(data.keys())}"
                        )
                        return False
                        
                except json.JSONDecodeError as e:
                    self.log_result(
                        "AI Portfolio Optimization",
                        False,
                        "Response is not valid JSON",
                        f"Raw response: {response.text[:200]}..."
                    )
                    return False
            else:
                self.log_result(
                    "AI Portfolio Optimization",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text[:200]
                )
                return False
                
        except Exception as e:
            self.log_result(
                "AI Portfolio Optimization",
                False,
                f"Request failed with exception: {str(e)}"
            )
            return False
    
    def test_predictive_insights_endpoint(self):
        """Test AI Predictive Insights endpoint"""
        print("\n🔮 Testing AI Predictive Insights endpoint...")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/ai/predictive-insights",
                headers=headers,
                timeout=30  # AI calls can take longer
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Validate response structure
                    if "predictive_insights" in data:
                        insights = data["predictive_insights"]
                        
                        # Check for required fields
                        required_fields = ["outlook_3m", "risks", "opportunities", "action_items"]
                        missing_fields = [field for field in required_fields if field not in insights]
                        
                        if not missing_fields:
                            self.log_result(
                                "AI Predictive Insights",
                                True,
                                "Predictive insights endpoint working correctly",
                                f"Response contains all required fields: {required_fields}"
                            )
                            
                            # Log sample insights
                            if insights.get("outlook_3m"):
                                outlook = str(insights["outlook_3m"])
                                print(f"   Sample 3M outlook: {outlook[:100]}...")
                            
                            return True
                        else:
                            self.log_result(
                                "AI Predictive Insights",
                                False,
                                f"Response missing required fields: {missing_fields}",
                                f"Available fields: {list(insights.keys())}"
                            )
                            return False
                    else:
                        self.log_result(
                            "AI Predictive Insights",
                            False,
                            "Response missing 'predictive_insights' field",
                            f"Response keys: {list(data.keys())}"
                        )
                        return False
                        
                except json.JSONDecodeError as e:
                    self.log_result(
                        "AI Predictive Insights",
                        False,
                        "Response is not valid JSON",
                        f"Raw response: {response.text[:200]}..."
                    )
                    return False
            else:
                self.log_result(
                    "AI Predictive Insights",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text[:200]
                )
                return False
                
        except Exception as e:
            self.log_result(
                "AI Predictive Insights",
                False,
                f"Request failed with exception: {str(e)}"
            )
            return False
    
    def test_error_handling(self):
        """Test error handling with invalid requests"""
        print("\n🚫 Testing error handling...")
        
        try:
            # Test without authentication
            response = requests.post(f"{BACKEND_URL}/ai/portfolio-optimization", timeout=10)
            
            if response.status_code == 401:
                self.log_result(
                    "Error Handling - No Auth",
                    True,
                    "Correctly returns 401 for unauthenticated requests"
                )
            else:
                self.log_result(
                    "Error Handling - No Auth",
                    False,
                    f"Expected 401, got {response.status_code}"
                )
            
            # Test with invalid token
            headers = {"Authorization": "Bearer invalid_token"}
            response = requests.post(
                f"{BACKEND_URL}/ai/portfolio-optimization",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Error Handling - Invalid Token",
                    True,
                    "Correctly returns 401 for invalid token"
                )
                return True
            else:
                self.log_result(
                    "Error Handling - Invalid Token",
                    False,
                    f"Expected 401, got {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Error Handling",
                False,
                f"Error handling test failed: {str(e)}"
            )
            return False
    
    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        try:
            if self.user_id:
                mongo_cmd = f"""
                use('test_database');
                db.users.deleteOne({{id: '{self.user_id}'}});
                db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
                db.portfolio.deleteMany({{user_id: '{self.user_id}'}});
                print('Cleanup completed');
                """
                
                subprocess.run(["mongosh", "--eval", mongo_cmd], timeout=10)
                print("✅ Test data cleaned up successfully")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting AI Insights Backend Testing...")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test User: {TEST_USER_EMAIL}")
        print("=" * 60)
        
        try:
            # Setup
            if not self.create_test_session():
                print("❌ Setup failed, aborting tests")
                return False
            
            # Authentication tests
            if not self.test_authentication():
                print("❌ Authentication failed, aborting tests")
                return False
            
            # Portfolio data test
            if not self.test_portfolio_data():
                print("❌ Portfolio data missing, aborting AI tests")
                return False
            
            # AI endpoint tests
            optimization_success = self.test_portfolio_optimization_endpoint()
            predictive_success = self.test_predictive_insights_endpoint()
            
            # Error handling tests
            self.test_error_handling()
            
            # Summary
            print("\n" + "=" * 60)
            print("📊 TEST SUMMARY")
            print("=" * 60)
            
            passed = sum(1 for r in self.test_results if r["success"])
            total = len(self.test_results)
            
            print(f"Total Tests: {total}")
            print(f"Passed: {passed}")
            print(f"Failed: {total - passed}")
            
            # Critical results
            critical_tests = ["AI Portfolio Optimization", "AI Predictive Insights"]
            critical_passed = all(
                any(r["test"] == test and r["success"] for r in self.test_results)
                for test in critical_tests
            )
            
            if critical_passed:
                print("\n✅ CRITICAL AI ENDPOINTS: ALL WORKING")
            else:
                print("\n❌ CRITICAL AI ENDPOINTS: FAILURES DETECTED")
            
            print("\nDetailed Results:")
            for result in self.test_results:
                status = "✅" if result["success"] else "❌"
                print(f"{status} {result['test']}: {result['message']}")
            
            return critical_passed
            
        finally:
            self.cleanup()

def main():
    """Main test execution"""
    tester = AIInsightsBackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All critical AI insights tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some critical tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()