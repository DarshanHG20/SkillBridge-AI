import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';

/// Interactive AI Tutor and Learning Chatbot screen with RAG grounding and citations.
class AiTutorChatScreen extends StatefulWidget {
  final String? initialTopic;
  final String? initialPrompt;

  const AiTutorChatScreen({super.key, this.initialTopic, this.initialPrompt});

  @override
  State<AiTutorChatScreen> createState() => _AiTutorChatScreenState();
}

class _AiTutorChatScreenState extends State<AiTutorChatScreen> {
  final _apiClient = ApiClient();
  final _textController = TextEditingController();
  final _scrollController = ScrollController();

  bool _isLoading = false;
  bool _isSending = false;
  bool _useRag = false;
  String? _errorMessage;

  int? _activeConversationId;
  String _activeTitle = 'New Tutoring Session';
  List<dynamic> _conversations = [];
  List<Map<String, dynamic>> _messages = [];

  Map<String, dynamic>? _tutorStatus;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final status = await _apiClient.getTutorStatus();
      final convs = await _apiClient.listChatConversations();

      if (!mounted) return;
      setState(() {
        _tutorStatus = status;
        _conversations = convs;
      });

      if (convs.isNotEmpty) {
        await _selectConversation(
          convs.first['id'] as int,
          convs.first['title'] as String,
        );
      } else {
        await _startNewConversation();
      }

      if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
        _textController.text = widget.initialPrompt!;
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _startNewConversation() async {
    try {
      final newConv = await _apiClient.createChatConversation(
        title: 'Session on ${widget.initialTopic ?? "Computer Science"}',
        topic: widget.initialTopic ?? 'general',
      );
      if (!mounted) return;
      setState(() {
        _activeConversationId = newConv['id'] as int;
        _activeTitle = newConv['title'] as String;
        _messages = [];
        _conversations.insert(0, newConv);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to create session: $e')));
      }
    }
  }

  Future<void> _selectConversation(int convId, String title) async {
    try {
      final detail = await _apiClient.getChatConversation(convId);
      final rawMsgs = (detail['messages'] as List? ?? []).cast<dynamic>();
      if (!mounted) return;
      setState(() {
        _activeConversationId = convId;
        _activeTitle = title;
        _messages = rawMsgs
            .map((m) => Map<String, dynamic>.from(m as Map))
            .toList();
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load conversation: $e')),
        );
      }
    }
  }

  Future<void> _deleteActiveConversation() async {
    if (_activeConversationId == null) return;
    try {
      await _apiClient.deleteChatConversation(_activeConversationId!);
      if (!mounted) return;
      setState(() {
        _conversations.removeWhere((c) => c['id'] == _activeConversationId);
      });
      if (_conversations.isNotEmpty) {
        await _selectConversation(
          _conversations.first['id'] as int,
          _conversations.first['title'] as String,
        );
      } else {
        await _startNewConversation();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to delete session: $e')));
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _activeConversationId == null || _isSending) return;

    _textController.clear();
    setState(() {
      _isSending = true;
      _messages.add({
        'sender': 'user',
        'message_text': text,
        'created_at': DateTime.now().toIso8601String(),
        'is_fallback': false,
      });
    });
    _scrollToBottom();

    try {
      final reply = await _apiClient.sendChatMessage(
        _activeConversationId!,
        text,
        useRag: _useRag,
      );

      if (!mounted) return;
      setState(() {
        _messages.add(reply);
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_activeTitle, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'New Session',
            onPressed: _startNewConversation,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.history),
            tooltip: 'Session History',
            onSelected: (val) {
              if (val == 'delete') {
                _deleteActiveConversation();
              } else {
                final id = int.tryParse(val);
                if (id != null) {
                  final found = _conversations.firstWhere(
                    (c) => c['id'] == id,
                    orElse: () => null,
                  );
                  if (found != null) {
                    _selectConversation(id, found['title'] as String);
                  }
                }
              }
            },
            itemBuilder: (ctx) {
              final items = <PopupMenuEntry<String>>[];
              for (final c in _conversations) {
                items.add(
                  PopupMenuItem(
                    value: c['id'].toString(),
                    child: Text(
                      c['title'] as String? ?? 'Session #${c['id']}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: c['id'] == _activeConversationId
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              }
              if (_conversations.isNotEmpty) {
                items.add(const PopupMenuDivider());
                items.add(
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(
                          Icons.delete_outline,
                          color: AppColors.error,
                          size: 20,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Delete Current Thread',
                          style: TextStyle(color: AppColors.error),
                        ),
                      ],
                    ),
                  ),
                );
              }
              return items;
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 48,
                      color: AppColors.error,
                    ),
                    const SizedBox(height: 16),
                    Text(_errorMessage!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _loadInitialData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: [
                _buildProviderBanner(),
                _buildRagControlBar(),
                Expanded(child: _buildMessagesList()),
                if (_isSending)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'SkillBridge AI Tutor is preparing response...',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                _buildMessageInput(),
              ],
            ),
    );
  }

  Widget _buildProviderBanner() {
    final provider = _tutorStatus?['ai_provider'] ?? 'none';
    final isLive = _tutorStatus?['is_live_llm'] ?? false;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: isLive ? const Color(0x1A10B981) : const Color(0x144F46E5),
      child: Row(
        children: [
          Icon(
            isLive ? Icons.cloud_done : Icons.offline_bolt,
            size: 16,
            color: isLive ? AppColors.success : AppColors.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              isLive
                  ? 'Connected to Live AI Provider: ${provider.toUpperCase()}'
                  : 'Deterministic Offline Fallback Active (Deterministic Educational Engine)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isLive ? AppColors.success : AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRagControlBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: const Border(bottom: BorderSide(color: Color(0x20808080))),
      ),
      child: Row(
        children: [
          const Icon(Icons.menu_book, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Ground with Educational Documents (RAG)',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
          Switch(
            value: _useRag,
            activeThumbColor: AppColors.primary,
            onChanged: (val) {
              setState(() {
                _useRag = val;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesList() {
    if (_messages.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.school_outlined, size: 64, color: AppColors.primary),
              SizedBox(height: 16),
              Text(
                'SkillBridge AI Tutor',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Ask any questions on programming, algorithms, data structures, or system architecture. '
                'Request progressive hints on coding challenges or career gap explanations.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (ctx, idx) {
        final msg = _messages[idx];
        final isUser = msg['sender'] == 'user';
        final isFallback = msg['is_fallback'] == true;
        final sources = (msg['sources_json'] as List? ?? []).cast<dynamic>();

        return Align(
          alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.85,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isUser ? AppColors.primary : Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16).copyWith(
                bottomRight: isUser
                    ? const Radius.circular(0)
                    : const Radius.circular(16),
                bottomLeft: !isUser
                    ? const Radius.circular(0)
                    : const Radius.circular(16),
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0A000000),
                  blurRadius: 4,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!isUser) ...[
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.psychology,
                        size: 14,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isFallback
                            ? 'SkillBridge Tutor (Offline Fallback)'
                            : 'SkillBridge AI Tutor',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                ],
                SelectableText(
                  msg['message_text'] as String? ?? '',
                  style: TextStyle(
                    color: isUser ? Colors.white : AppColors.textPrimary,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
                if (sources.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Divider(height: 1),
                  const SizedBox(height: 6),
                  const Row(
                    children: [
                      Icon(
                        Icons.bookmark_added,
                        size: 12,
                        color: AppColors.success,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Grounded Source Citations:',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  for (final src in sources)
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0x30808080)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            src['document_title'] as String? ??
                                'Educational Document',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                              color: AppColors.primary,
                            ),
                          ),
                          if (src['page_number'] != null)
                            Text(
                              'Page ${src['page_number']}',
                              style: const TextStyle(
                                fontSize: 10,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            src['snippet'] as String? ?? '',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: const Border(top: BorderSide(color: Color(0x20808080))),
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _textController,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
                maxLines: null,
                decoration: const InputDecoration(
                  hintText: 'Ask a question or request a hint...',
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                ),
              ),
            ),
            IconButton(
              icon: Icon(
                Icons.send,
                color: _isSending ? Colors.grey : AppColors.primary,
              ),
              onPressed: _isSending ? null : _sendMessage,
            ),
          ],
        ),
      ),
    );
  }
}
