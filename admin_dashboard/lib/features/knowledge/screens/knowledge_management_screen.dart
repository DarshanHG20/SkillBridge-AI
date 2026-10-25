import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';

/// Admin console management for AI Tutor status, approved RAG documents, and vector index.
class KnowledgeManagementScreen extends StatefulWidget {
  const KnowledgeManagementScreen({super.key});

  @override
  State<KnowledgeManagementScreen> createState() =>
      _KnowledgeManagementScreenState();
}

class _KnowledgeManagementScreenState extends State<KnowledgeManagementScreen> {
  final _apiClient = AdminApiClient();
  final _queryController = TextEditingController();

  bool _isLoading = false;
  bool _isRebuilding = false;
  bool _isSearching = false;
  String? _errorMessage;

  Map<String, dynamic>? _tutorStatus;
  List<dynamic> _documents = [];
  Map<String, dynamic>? _searchResult;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final status = await _apiClient.getTutorStatus();
      final docs = await _apiClient.listDocuments();

      if (!mounted) return;
      setState(() {
        _tutorStatus = status;
        _documents = docs;
      });
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

  Future<void> _rebuildIndex() async {
    setState(() {
      _isRebuilding = true;
    });

    try {
      await _apiClient.rebuildVectorIndex();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vector index successfully synchronized and rebuilt.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Rebuild failed: $e')));
    } finally {
      if (mounted) {
        setState(() {
          _isRebuilding = false;
        });
      }
    }
  }

  Future<void> _deleteDocument(int docId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Document'),
        content: const Text(
          'Are you sure you want to delete this approved document and purge its vector index?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AdminColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _apiClient.deleteDocument(docId);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Document deleted.')));
      _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Delete failed: $e')));
    }
  }

  Future<void> _runTestQuery() async {
    final query = _queryController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isSearching = true;
      _searchResult = null;
    });

    try {
      final res = await _apiClient.queryRag(query);
      if (!mounted) return;
      setState(() {
        _searchResult = res;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Search error: $e')));
    } finally {
      if (mounted) {
        setState(() {
          _isSearching = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      activeRoute: '/knowledge',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 48,
                    color: AdminColors.error,
                  ),
                  const SizedBox(height: 16),
                  Text(_errorMessage!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                _buildHeader(),
                const SizedBox(height: 20),
                _buildTutorStatusCard(),
                const SizedBox(height: 20),
                _buildDocumentsCard(),
                const SizedBox(height: 20),
                _buildTestQueryCard(),
              ],
            ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AI Tutor & Knowledge Pipeline',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AdminColors.textPrimary,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Manage provider credentials, approved reference materials, and vector indexing.',
              style: TextStyle(color: AdminColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
        const Spacer(),
        ElevatedButton.icon(
          icon: _isRebuilding
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.sync, size: 16),
          label: Text(
            _isRebuilding ? 'Rebuilding Index...' : 'Rebuild Vector Index',
          ),
          onPressed: _isRebuilding ? null : _rebuildIndex,
        ),
      ],
    );
  }

  Widget _buildTutorStatusCard() {
    final provider = _tutorStatus?['ai_provider'] ?? 'none';
    final isLive = _tutorStatus?['is_live_llm'] ?? false;
    final rateLimit = _tutorStatus?['daily_rate_limit'] ?? 50;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: isLive
                  ? const Color(0x1A10B981)
                  : const Color(0x144F46E5),
              radius: 24,
              child: Icon(
                isLive ? Icons.cloud_done : Icons.offline_bolt,
                color: isLive ? AdminColors.success : AdminColors.primary,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isLive
                        ? 'Live Provider Active: ${provider.toString().toUpperCase()}'
                        : 'Provider-Independent Deterministic Fallback Active',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Daily Rate Limit: $rateLimit requests/user • Model: ${_tutorStatus?['model_name'] ?? 'rule_based_tutor_v1'} • Credentials Kept on Backend',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AdminColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentsCard() {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.menu_book, color: AdminColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Approved Educational Reference Documents (${_documents.length})',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_documents.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Text('No documents currently indexed.'),
                ),
              )
            else
              Table(
                columnWidths: const {
                  0: FlexColumnWidth(3),
                  1: FlexColumnWidth(2),
                  2: FlexColumnWidth(1),
                  3: FlexColumnWidth(1),
                  4: FlexColumnWidth(1),
                },
                children: [
                  TableRow(
                    decoration: const BoxDecoration(color: Color(0x0A000000)),
                    children: [
                      _th('Title'),
                      _th('Filename'),
                      _th('Size'),
                      _th('Chunks'),
                      _th('Actions'),
                    ],
                  ),
                  for (final doc in _documents)
                    TableRow(
                      children: [
                        _td(doc['title'] as String? ?? ''),
                        _td(doc['filename'] as String? ?? ''),
                        _td(
                          '${((doc['file_size_bytes'] as num? ?? 0) / 1024).toStringAsFixed(1)} KB',
                        ),
                        _td('${doc['chunk_count'] ?? 0}'),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: IconButton(
                            icon: const Icon(
                              Icons.delete_outline,
                              size: 18,
                              color: AdminColors.error,
                            ),
                            tooltip: 'Delete Document',
                            onPressed: () => _deleteDocument(doc['id'] as int),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestQueryCard() {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.query_stats, color: AdminColors.primary),
                SizedBox(width: 8),
                Text(
                  'RAG Retrieval Verification Sandbox',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Test search accuracy and citation verification over active educational index partitions.',
              style: TextStyle(fontSize: 12, color: AdminColors.textSecondary),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _queryController,
                    decoration: const InputDecoration(
                      hintText: 'Enter test query, e.g. "What are ACID guarantees in databases?"',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _runTestQuery(),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _isSearching ? null : _runTestQuery,
                  child: _isSearching
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Test Retrieval'),
                ),
              ],
            ),
            if (_searchResult != null) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              SelectableText(
                _searchResult!['answer'] as String? ?? '',
                style: const TextStyle(fontSize: 13, height: 1.4),
              ),
              if ((_searchResult!['sources'] as List? ?? []).isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text(
                  'Retrieved Chunks & Citations:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const SizedBox(height: 6),
                for (final src
                    in (_searchResult!['sources'] as List).cast<dynamic>())
                  Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0x0A000000),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${src['document_title']}: "${src['snippet']}"',
                      style: const TextStyle(
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _th(String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      child: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 12,
          color: AdminColors.textSecondary,
        ),
      ),
    );
  }

  Widget _td(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Text(text, style: const TextStyle(fontSize: 13)),
    );
  }
}
