import 'dart:convert';  // For decoding JSON
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;  // For making HTTP requests
import 'package:socket_io_client/socket_io_client.dart' as IO;  // For Socket.IO

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Real-Time Flutter',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: RealTimeScreen(),
    );
  }
}

class RealTimeScreen extends StatefulWidget {
  @override
  _RealTimeScreenState createState() => _RealTimeScreenState();
}

class _RealTimeScreenState extends State<RealTimeScreen> {
  late IO.Socket socket;  // For Socket.IO connection
  List<Map<String, dynamic>> users = [];  // To store users from the backend

  @override
  void initState() {
    super.initState();
    fetchUsers();  // Fetch users when the screen loads
    connectToServer();  // Connect to the Socket.IO server
  }

  // Function to fetch users from the backend
  Future<void> fetchUsers() async {
    final url = 'http://localhost:3000/users';  // Use your server IP or localhost

    try {
      final response = await http.get(Uri.parse(url));  // Send GET request

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          users = List<Map<String, dynamic>>.from(data['users']);  // Update users list
        });
      } else {
        print('Failed to load users');
      }
    } catch (e) {
      print('Error: $e');
    }
  }

  // Function to connect to the Socket.IO server
  void connectToServer() {
    socket = IO.io('http://localhost:3000', IO.OptionBuilder()
        .setTransports(['websocket'])  // Use WebSockets
        .disableAutoConnect()  // Disable auto connect
        .build());

    socket.connect();

    socket.onConnect((_) {
      print('🟢 Socket connected');
    });

    // Listen for real-time updates from the server
    socket.on('user_added', (data) {
      print('📩 New user added: $data');
      setState(() {
        users.add(data);  // Add the new user to the list
      });
    });

    socket.on('user_updated', (data) {
      print('📩 User updated: $data');
      setState(() {
        // Update the user in the list (find by id or name)
        final index = users.indexWhere((user) => user['id'] == data['id']);
        if (index != -1) {
          users[index] = data;  // Update user details
        }
      });
    });

    socket.on('user_deleted', (data) {
      print('📩 User deleted: $data');
      setState(() {
        users.removeWhere((user) => user['id'] == data['id']);  // Remove deleted user
      });
    });

    socket.onDisconnect((_) {
      print('🔴 Socket disconnected');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Real-Time Data"),
      ),
      body: users.isEmpty
          ? Center(child: CircularProgressIndicator())  // Show loading while fetching data
          : ListView.builder(
              itemCount: users.length,
              itemBuilder: (context, index) {
                final user = users[index];
                return ListTile(
                  title: Text(user['name'] ?? 'No name'),
                  subtitle: Text(user['gender'] ?? 'No gender'),
                );
              },
            ),
    );
  }
}
