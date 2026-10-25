import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';

/// Educational reference document catalog and RAG knowledge search interface.
class DocumentLibraryScreen extends StatefulWidget {
  const DocumentLibraryScreen({super.key});

  @override
  State<DocumentLibraryScreen> createState() => _DocumentLibraryScreenState();
}

class _DocumentLibraryScreenState extends State<DocumentLibraryScreen> {
  final _apiClient = ApiClient();
  final _searchController = TextEditingController();

  bool _isLoading = false;
  bool _isSearching = false;
  String? _errorMessage;

  List<dynamic> _documents = [];
  Map<String, dynamic>? _searchResult;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final docs = await _apiClient.listRagDocuments();
      if (!mounted) return;
      setState(() {
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

  Future<void> _runRAGSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isSearching = true;
      _searchResult = null;
    });

    try {
      final res = await _apiClient.queryRag(query, topK: 3);
      if (!mounted) return;
      setState(() {
        _searchResult = res;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Search failed: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSearching = false;
        });
      }
    }
  }

  void _showDocumentDetails(Map<String, dynamic> doc) async {
    final docId = doc['id'] as int;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => FutureBuilder<Map<String, dynamic>>(
        future: _apiClient.getRagDocumentDetail(docId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const SizedBox(
              height: 300,
              child: Center(child: CircularProgressIndicator()),
            );
          }
          if (snapshot.hasError) {
            return SizedBox(
              height: 300,
              child: Center(child: Text('Error: ${snapshot.error}')),
            );
          }

          final detail = snapshot.data!;
          final chunks = (detail['chunks'] as List? ?? []).cast<dynamic>();

          return DraggableScrollableSheet(
            initialChildSize: 0.7,
            minChildSize: 0.4,
            maxChildSize: 0.95,
            expand: false,
            builder: (_, scrollCtrl) {
              return Container(
                padding: const EdgeInsets.all(20),
                child: ListView(
                  controller: scrollCtrl,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.description, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            detail['title'] as String? ?? 'Document',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Filename: ${detail['filename']} • Format: ${detail['file_type'].toString().toUpperCase()} • Chunks: ${detail['chunk_count']}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Indexed Text Partitions (Chunks):',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    for (int i = 0; i < chunks.length; i++)
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0x30808080)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Chip(
                                  label: Text(
                                    'Chunk #${chunks[i]['chunk_index'] + 1}',
                                    style: const TextStyle(fontSize: 10),
                                  ),
                                  padding: EdgeInsets.zero,
                                  materialTapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                const Spacer(),
                                Text(
                                  'Chars: ${chunks[i]['char_start']}-${chunks[i]['char_end']}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              chunks[i]['text_content'] as String? ?? '',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Knowledge Library & RAG'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _loadDocuments,
          ),
        ],
      ),
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
                    color: AppColors.error,
                  ),
                  const SizedBox(height: 16),
                  Text(_errorMessage!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadDocuments,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildRAGSearchCard(),
                const SizedBox(height: 24),
                const Text(
                  'Approved Educational Documents',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Verified course reference materials indexed for grounded question answering.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                if (_documents.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text('No approved documents in the library yet.'),
                    ),
                  )
                else
                  for (final doc in _documents)
                    Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0x1A4F46E5),
                          child: Icon(
                            Icons.menu_book,
                            color: AppColors.primary,
                          ),
                        ),
                        title: Text(
                          doc['title'] as String? ?? 'Educational Document',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          '${doc['filename']} • ${(doc['file_size_bytes'] / 1024).toStringAsFixed(1)} KB • ${doc['chunk_count']} chunks',
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () =>
                            _showDocumentDetails(doc as Map<String, dynamic>),
                      ),
                    ),
              ],
            ),
    );
  }

  Widget _buildRAGSearchCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.search, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Grounded Knowledge Retrieval',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Query our vector-indexed educational reference materials directly with full source citations.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'e.g., How do B-tree indexes work?',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _runRAGSearch(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isSearching ? null : _runRAGSearch,
                  child: _isSearching
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Search'),
                ),
              ],
            ),
            if (_searchResult != null) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    _searchResult!['evidence_sufficient'] == true
                        ? Icons.check_circle
                        : Icons.warning_amber,
                    color: _searchResult!['evidence_sufficient'] == true
                        ? AppColors.success
                        : AppColors.warning,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _searchResult!['evidence_sufficient'] == true
                        ? 'Grounded Response (Evidence Verified)'
                        : 'Insufficient Evidence in Knowledge Base',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: _searchResult!['evidence_sufficient'] == true
                          ? AppColors.success
                          : AppColors.warning,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SelectableText(
                _searchResult!['answer'] as String? ?? '',
                style: const TextStyle(fontSize: 13, height: 1.4),
              ),
              if ((_searchResult!['sources'] as List? ?? []).isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text(
                  'Cited Document Sources:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const SizedBox(height: 6),
                for (final src
                    in (_searchResult!['sources'] as List).cast<dynamic>())
                  Container(
                    margin: const EdgeInsets.only(bottom: 6),
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
                          '${src['document_title']} (Relevance: ${((src['relevance_score'] as num?)?.toDouble() ?? 0.0).toStringAsFixed(2)})',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          src['snippet'] as String? ?? '',
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
          ],
        ),
      ),
    );
  }
}
